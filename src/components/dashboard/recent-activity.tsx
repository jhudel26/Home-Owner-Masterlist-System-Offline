"use client";

import React from "react";
import { ActivityLog } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { Clock, UserPlus, Edit3, Trash2, FileSpreadsheet, ShieldAlert, Sparkles, Settings, RefreshCw } from "lucide-react";

interface RecentActivityProps {
  logs: ActivityLog[];
}

export function RecentActivity({ logs }: RecentActivityProps) {
  const getActionDetails = (action: string) => {
    switch (action) {
      case "CREATED_HOMEOWNER":
        return {
          icon: <UserPlus className="h-4 w-4 text-teal-600" />,
          bgColor: "bg-teal-50 border-teal-200",
          tag: "Added",
          tagColor: "bg-teal-100/80 text-teal-800",
        };
      case "UPDATED_HOMEOWNER":
      case "UPDATED_STATUS":
        return {
          icon: <Edit3 className="h-4 w-4 text-sky-600" />,
          bgColor: "bg-sky-50 border-sky-200",
          tag: action === "UPDATED_STATUS" ? "Status" : "Updated",
          tagColor: "bg-sky-100/80 text-sky-800",
        };
      case "DELETED_HOMEOWNER":
        return {
          icon: <Trash2 className="h-4 w-4 text-red-600" />,
          bgColor: "bg-red-50 border-red-200",
          tag: "Archived",
          tagColor: "bg-red-100/80 text-red-800",
        };
      case "EXPORTED_EXCEL":
        return {
          icon: <FileSpreadsheet className="h-4 w-4 text-teal-600" />,
          bgColor: "bg-teal-50 border-teal-200",
          tag: "Export",
          tagColor: "bg-teal-100/80 text-teal-800",
        };
      case "UPDATED_MONTHLY_DUES":
        return {
          icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600" />,
          bgColor: "bg-emerald-50 border-emerald-200",
          tag: "Dues",
          tagColor: "bg-emerald-100/80 text-emerald-800",
        };
      case "RESTORED_BACKUP":
        return {
          icon: <RefreshCw className="h-4 w-4 text-indigo-600" />,
          bgColor: "bg-indigo-50 border-indigo-200",
          tag: "Restore",
          tagColor: "bg-indigo-100/80 text-indigo-800",
        };
      case "UPDATED_SETTINGS":
        return {
          icon: <Settings className="h-4 w-4 text-violet-600" />,
          bgColor: "bg-violet-50 border-violet-200",
          tag: "Settings",
          tagColor: "bg-violet-100/80 text-violet-800",
        };
      case "SYSTEM_INITIALIZED":
        return {
          icon: <Sparkles className="h-4 w-4 text-teal-600" />,
          bgColor: "bg-teal-50 border-teal-200",
          tag: "System",
          tagColor: "bg-teal-100 text-teal-800",
        };
      default:
        return {
          icon: <ShieldAlert className="h-4 w-4 text-slate-500" />,
          bgColor: "bg-slate-50 border-slate-200",
          tag: "Audit",
          tagColor: "bg-slate-100 text-slate-700",
        };
    }
  };

  const formatActionText = (log: ActivityLog) => {
    const hoName = log.details?.name || log.details?.full_name || "a homeowner";
    const hoAddress = log.details?.address || log.details?.street_name || "Phase 4";

    switch (log.action) {
      case "CREATED_HOMEOWNER":
        return `registered new homeowner "${hoName !== "a homeowner" ? hoName : "Unknown"}" at ${hoAddress}`;
      case "UPDATED_HOMEOWNER":
        return `updated records for "${hoName}"`;
      case "DELETED_HOMEOWNER":
        return `archived homeowner "${hoName}"`;
      case "UPDATED_STATUS":
        return `${log.details?.is_active ? "activated" : "archived"} status for "${hoName}"`;
      case "UPDATED_MONTHLY_DUES":
        return "updated monthly dues payment records";
      case "EXPORTED_EXCEL":
        return "exported the official homeowner masterlist (.xlsx)";
      case "RESTORED_BACKUP":
        return `restored database backup (${log.details?.count ?? 0} homeowners)`;
      case "UPDATED_SETTINGS":
        return "updated system configuration and dues settings";
      case "UPDATED_USER_PERMISSIONS":
        return `modified access privileges for ${log.details?.target_user || "user"}`;
      case "SYSTEM_INITIALIZED":
        return "initialized system registry and baseline records";
      default:
        return log.action.replace(/_/g, " ").toLowerCase();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">Recent Activity</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Official audit log trail</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
          Live
        </span>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No recent actions recorded</p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {logs.slice(0, 15).map((log) => {
            const meta = getActionDetails(log.action);
            return (
              <div key={log.id} className="relative flex items-start gap-3.5 group">
                {/* Timeline Dot */}
                <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-[#0e192d] border-2 border-slate-300 dark:border-slate-700 group-hover:border-teal-600 transition-colors">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 group-hover:bg-teal-600 transition-colors" />
                </div>

                {/* Content Card */}
                <div className="flex-1 min-w-0 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#091424]/70 hover:bg-white dark:hover:bg-[#13233f] hover:border-slate-200 dark:hover:border-teal-500/30 hover:shadow-subtle transition-all duration-200 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 mt-0.5 ${meta.bgColor}`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{log.user_name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${meta.tagColor}`}>
                          {meta.tag}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                        {formatActionText(log)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono pl-9">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
