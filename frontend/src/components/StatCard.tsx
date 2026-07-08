import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  delay?: number;
  color?: "green" | "amber" | "blue" | "purple";
}

const colorMap = {
  green: "bg-primary/10 text-primary",
  amber: "bg-ch-amber/10 text-ch-amber",
  blue: "bg-ch-blue/10 text-ch-blue",
  purple: "bg-ch-purple/10 text-ch-purple",
};

export default function StatCard({ icon: Icon, label, value, change, changeType = "up", delay = 0, color = "green" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-glow rounded-xl bg-card p-5 border border-border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={`text-xs font-mono font-medium ${changeType === "up" ? "text-primary" : changeType === "down" ? "text-ch-red" : "text-muted-foreground"}`}>
            {changeType === "up" ? "↑" : changeType === "down" ? "↓" : "→"} {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}
