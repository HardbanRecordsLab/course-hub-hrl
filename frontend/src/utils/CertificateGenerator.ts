import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateCertificatePDF(params: {
  studentName: string;
  courseTitle: string;
  verificationCode: string;
  issuedAt: string;
}) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1120px";
  container.style.height = "790px";
  container.style.background = "#0a0a0a";
  container.style.padding = "60px";
  container.style.boxSizing = "border-box";
  container.style.fontFamily = "'Space Grotesk', sans-serif";
  container.style.color = "#ffffff";

  container.innerHTML = `
    <div style="width:100%;height:100%;border:3px solid #10b981;border-radius:16px;padding:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;">
      <div style="position:absolute;top:20px;left:30px;font-size:14px;color:#10b981;font-weight:600;letter-spacing:2px;">HRL COURSE HUB</div>
      <div style="position:absolute;top:20px;right:30px;font-size:11px;color:#666;">${new Date(params.issuedAt).toLocaleDateString("pl-PL")}</div>
      <p style="font-size:13px;letter-spacing:4px;color:#10b981;margin-bottom:12px;">CERTYFIKAT UKOŃCZENIA</p>
      <h1 style="font-size:42px;font-weight:700;margin:0 0 8px 0;text-align:center;">${params.studentName}</h1>
      <p style="font-size:16px;color:#999;margin:0 0 30px 0;">pomyślnie ukończył kurs</p>
      <h2 style="font-size:24px;font-weight:600;color:#e0e0e0;margin:0 0 40px 0;text-align:center;">${params.courseTitle}</h2>
      <div style="position:absolute;bottom:25px;left:30px;right:30px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #222;padding-top:15px;">
        <span style="font-size:10px;color:#555;font-family:monospace;">Kod: ${params.verificationCode}</span>
        <span style="font-size:10px;color:#555;">Weryfikacja: app-course-hub.hardbanrecordslab.online/verify/${params.verificationCode}</span>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#0a0a0a" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
    pdf.save(`certyfikat-${params.verificationCode}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
