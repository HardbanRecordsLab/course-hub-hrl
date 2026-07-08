<?php
/**
 * Plugin Name: HRL Course Hub Verifier
 * Description: Weryfikuje JWT-linki (?ch_token=...) z HRL Course Hub i wpuszcza studentów do chronionych treści kursu.
 * Version: 1.0.0
 * Author: HRL Course Hub
 *
 * Konfiguracja:
 *   WP Admin → Ustawienia → HRL Course Hub Verifier
 *   → "JWT Secret" — ten sam sekret co Course.integrationSecretHash w HRL Course Hub
 *   → "Ścieżki chronione" (opcjonalnie) — lista ścieżek URL wymagających weryfikacji, np. /kurs/
 *
 * Jak działa:
 *   1. Wchodząc na stronę z ?ch_token=..., plugin weryfikuje podpis (HMAC-SHA256) i datę exp
 *   2. Jeśli OK — zapisuje info o użytkowniku w sesji WP i przepuszcza
 *   3. Jeśli nie — przekierowuje na adres frontendu HRL Course Hub
 */

if (!defined('ABSPATH')) exit;

class HRL_Course_Hub_Verifier {
    const SESSION_KEY = 'hrl_chub_verified';
    const OPTION_SECRET = 'hrl_chub_jwt_secret';
    const OPTION_PROTECTED_PATHS = 'hrl_chub_protected_paths';
    const COOKIE_NAME = 'hrl_chub_token';
    const COOKIE_LIFETIME = 86400; // 24h

    public function __construct() {
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('template_redirect', [$this, 'verify_token'], 1);
    }

    public function register_settings() {
        register_setting('hrl_chub_settings', self::OPTION_SECRET, [
            'sanitize_callback' => [$this, 'sanitize_secret'],
        ]);
        register_setting('hrl_chub_settings', self::OPTION_PROTECTED_PATHS, [
            'sanitize_callback' => 'sanitize_textarea_field',
        ]);
    }

    public function sanitize_secret($value) {
        $value = trim($value);
        if (empty($value)) return '';
        if (strlen($value) < 32) {
            add_settings_error(self::OPTION_SECRET, 'too_short', 'Sekret musi mieć co najmniej 32 znaki.');
            return get_option(self::OPTION_SECRET);
        }
        return $value;
    }

    public function add_settings_page() {
        add_options_page(
            'HRL Course Hub Verifier',
            'HRL Course Hub',
            'manage_options',
            'hrl-chub-verifier',
            [$this, 'render_settings_page']
        );
    }

    public function render_settings_page() {
        $secret = get_option(self::OPTION_SECRET, '');
        $paths = get_option(self::OPTION_PROTECTED_PATHS, '');
        ?>
        <div class="wrap">
            <h1>HRL Course Hub Verifier</h1>
            <p>Weryfikuje JWT-linki z HRL Course Hub. <a href="https://app-course-hub.hardbanrecordslab.online" target="_blank">Otwórz panel admina</a></p>
            <form method="post" action="options.php">
                <?php settings_fields('hrl_chub_settings'); do_settings_sections('hrl_chub_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="<?= self::OPTION_SECRET ?>">JWT Secret</label></th>
                        <td>
                            <input type="password" id="<?= self::OPTION_SECRET ?>"
                                   name="<?= self::OPTION_SECRET ?>" value="<?= esc_attr($secret) ?>"
                                   class="regular-text" style="width: 100%; max-width: 500px;" />
                            <p class="description">Sekret per-kurs (Course.integrationSecretHash) z panelu HRL Course Hub. Wygeneruj przez: <code>openssl rand -hex 32</code></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="<?= self::OPTION_PROTECTED_PATHS ?>">Chronione ścieżki (opcjonalnie)</label></th>
                        <td>
                            <textarea id="<?= self::OPTION_PROTECTED_PATHS ?>"
                                      name="<?= self::OPTION_PROTECTED_PATHS ?>" rows="5"
                                      class="regular-text" style="width: 100%; max-width: 500px;"
                                      placeholder="/kurs/&#10;/lekcja/&#10;/modul/"><?= esc_textarea($paths) ?></textarea>
                            <p class="description">Jedna ścieżka na linię. Puste = wszystkie strony wymagają weryfikacji. Przykład: <code>/kurs/</code></p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function verify_token() {
        $secret = get_option(self::OPTION_SECRET, '');
        if (empty($secret)) return; // brak konfiguracji — przepuść

        $protectedPaths = $this->get_protected_paths();
        $currentPath = $_SERVER['REQUEST_URI'] ?? '';
        if (!empty($protectedPaths) && !$this->matches_any_path($currentPath, $protectedPaths)) {
            return; // ścieżka niechroniona — przepuść
        }

        // Sprawdź czy już zweryfikowany w sesji
        $verified = isset($_SESSION[self::SESSION_KEY]) && $_SESSION[self::SESSION_KEY]['exp'] > time();
        if ($verified) return;

        // Sprawdź cookie
        if (empty($_COOKIE[self::COOKIE_NAME])) {
            $token = $_GET['ch_token'] ?? null;
            if (!$token) {
                $this->redirect_or_deny('Brak tokenu dostępu. Zaloguj się w HRL Course Hub.');
                return;
            }

            $payload = $this->decode_and_verify_jwt($token, $secret);
            if (!$payload) {
                $this->redirect_or_deny('Nieprawidłowy lub wygasły token.');
                return;
            }

            // Zapisz w sesji i cookie
            $_SESSION[self::SESSION_KEY] = [
                'user_id' => $payload['sub'] ?? '',
                'email' => $payload['email'] ?? '',
                'course_id' => $payload['courseId'] ?? '',
                'exp' => $payload['exp'] ?? (time() + self::COOKIE_LIFETIME),
            ];
            setcookie(self::COOKIE_NAME, $token, [
                'expires' => time() + self::COOKIE_LIFETIME,
                'path' => '/',
                'secure' => is_ssl(),
                'httponly' => true,
                'samesite' => 'Lax',
            ]);

            // Przekieruj usuwając ?ch_token z URL
            $cleanUrl = remove_query_arg('ch_token', $_SERVER['REQUEST_URI']);
            wp_safe_redirect($cleanUrl);
            exit;
        }

        // Cookie istnieje — zweryfikuj ponownie
        $payload = $this->decode_and_verify_jwt($_COOKIE[self::COOKIE_NAME], $secret);
        if (!$payload) {
            // Cookie nieważne
            setcookie(self::COOKIE_NAME, '', time() - 3600, '/');
            $this->redirect_or_deny('Sesja wygasła. Wygeneruj nowy link w portalu HRL Course Hub.');
            return;
        }
        $_SESSION[self::SESSION_KEY] = [
            'user_id' => $payload['sub'] ?? '',
            'email' => $payload['email'] ?? '',
            'course_id' => $payload['courseId'] ?? '',
            'exp' => $payload['exp'] ?? (time() + self::COOKIE_LIFETIME),
        ];
    }

    private function decode_and_verify_jwt($token, $secret) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        $header = json_decode($this->base64url_decode($parts[0]), true);
        $payload = json_decode($this->base64url_decode($parts[1]), true);
        $signature = $this->base64url_decode($parts[2]);

        if (!$header || !$payload) return null;

        // Weryfikacja algorytmu
        if (($header['alg'] ?? '') !== 'HS256') return null;

        // Weryfikacja podpisu
        $expected = hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true);
        if (!hash_equals($expected, $signature)) return null;

        // Weryfikacja exp
        if (!isset($payload['exp']) || $payload['exp'] < time()) return null;

        // Weryfikacja iss
        if (isset($payload['iss']) && $payload['iss'] !== 'HRL Course Hub') return null;

        return $payload;
    }

    private function base64url_decode($input) {
        $remainder = strlen($input) % 4;
        if ($remainder) $input .= str_repeat('=', 4 - $remainder);
        return base64_decode(strtr($input, '-_', '+/'));
    }

    private function get_protected_paths() {
        $raw = get_option(self::OPTION_PROTECTED_PATHS, '');
        if (empty($raw)) return [];
        return array_filter(array_map('trim', explode("\n", $raw)));
    }

    private function matches_any_path($url, $patterns) {
        foreach ($patterns as $pattern) {
            if (strpos($url, $pattern) !== false) return true;
        }
        return false;
    }

    private function redirect_or_deny($message) {
        $frontend = 'https://app-course-hub.hardbanrecordslab.online';
        if (function_exists('wp_safe_redirect')) {
            wp_safe_redirect($frontend . '?error=access_denied&msg=' . urlencode($message));
            exit;
        }
        wp_die($message, 'Brak dostępu', ['response' => 403]);
    }
}

// Inicjalizacja
add_action('init', function() {
    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        session_start();
    }
    new HRL_Course_Hub_Verifier();
});
