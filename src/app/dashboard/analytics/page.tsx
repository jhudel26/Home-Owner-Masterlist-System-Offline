"use client";

import { useEffect, useState } from "react";

import {
  Activity,
  BarChart3,
  Chrome,
  Database,
  Globe,
  Monitor,
  RefreshCw,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/context/auth-context";
import { useApp } from "@/context/app-context";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui/card";

type DailyAnalytics = {
  date: string;
  label: string;
  pageviews: number;
  visitors: number;
};

type AnalyticsItem = {
  route?: string;
  country?: string;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  referrerHostname?: string;
  environment?: string;
  pageviews?: number;
  visitors?: number;
};

type AnalyticsData = {
  pageViews: number;
  visitors: number;

  daily: DailyAnalytics[];

  topRoutes: AnalyticsItem[];
  topCountries: AnalyticsItem[];
  topDevices: AnalyticsItem[];
  topBrowsers: AnalyticsItem[];
  topOperatingSystems: AnalyticsItem[];
  topReferrers: AnalyticsItem[];
  environments: AnalyticsItem[];

  loading: boolean;
  error: string | null;

  since: string | null;
  until: string | null;
};

function formatNumber(
  value: number
): string {
  return new Intl.NumberFormat(
    "en-US"
  ).format(value);
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getName(
  value: string | undefined,
  fallback = "Unknown"
): string {
  if (!value) {
    return fallback;
  }

  return value;
}

function getPercentage(
  value: number,
  total: number
): number {
  if (!total) {
    return 0;
  }

  return Math.round(
    (value / total) * 100
  );
}

/*
 * ============================================================
 * SECTION HEADER
 * ============================================================
 */

function SectionHeader({
  icon,
  title,
  description,
  iconClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        {icon}
      </div>

      <div>
        <h2 className="font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * RANKED ROW
 * ============================================================
 */

function AnalyticsRow({
  index,
  name,
  value,
  total,
  valueLabel,
}: {
  index: number;
  name: string;
  value: number;
  total: number;
  valueLabel: string;
}) {
  const percentage =
    getPercentage(
      value,
      total
    );

  return (
    <div className="group border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {name}
            </span>

            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {formatNumber(
                  value
                )}
              </span>

              <span className="text-xs text-slate-400">
                {valueLabel}
              </span>
            </div>
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  percentage,
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <span className="w-10 text-right text-xs font-medium text-slate-400">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[180px] items-center justify-center text-sm text-slate-400">
      {text}
    </div>
  );
}

export default function AnalyticsPage() {
  const { currentUser } =
    useAuth();

  const {
    homeowners,
    allProfiles,
  } = useApp();

  const [
    selectedDays,
    setSelectedDays,
  ] = useState(7);

  const [
    analyticsData,
    setAnalyticsData,
  ] =
    useState<AnalyticsData>({
      pageViews: 0,
      visitors: 0,

      daily: [],

      topRoutes: [],
      topCountries: [],
      topDevices: [],
      topBrowsers: [],
      topOperatingSystems: [],
      topReferrers: [],
      environments: [],

      loading: true,
      error: null,

      since: null,
      until: null,
    });

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  /*
   * ============================================================
   * DATABASE METRICS
   * ============================================================
   */

  const totalHomeowners =
    homeowners.length;

  const activeUsers =
    allProfiles.filter(
      (profile) =>
        profile.status ===
        "Active"
    ).length;

  const totalHouseholdMembers =
    homeowners.reduce(
      (
        total,
        homeowner
      ) =>
        total +
        (homeowner
          .household_members
          ?.length || 0),
      0
    );

  const totalPets =
    homeowners.reduce(
      (
        total,
        homeowner
      ) =>
        total +
        Number(
          homeowner.registered_pets ??
            homeowner.pet_count ??
            0
        ),
      0
    );

  /*
   * ============================================================
   * FETCH
   * ============================================================
   */

  async function fetchAnalytics(
    days: number
  ) {
    try {
      setAnalyticsData(
        (previous) => ({
          ...previous,
          loading: true,
          error: null,
        })
      );

      const response =
        await fetch(
          `/api/analytics?days=${days}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          `API error (${response.status}): ${errorText}`
        );
      }

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          data.error ||
            "Unable to load analytics."
        );
      }

      setAnalyticsData({
        pageViews:
          Number(
            data.pageViews || 0
          ),

        visitors:
          Number(
            data.visitors || 0
          ),

        daily:
          Array.isArray(
            data.daily
          )
            ? data.daily
            : [],

        topRoutes:
          Array.isArray(
            data.topRoutes
          )
            ? data.topRoutes
            : [],

        topCountries:
          Array.isArray(
            data.topCountries
          )
            ? data.topCountries
            : [],

        topDevices:
          Array.isArray(
            data.topDevices
          )
            ? data.topDevices
            : [],

        topBrowsers:
          Array.isArray(
            data.topBrowsers
          )
            ? data.topBrowsers
            : [],

        topOperatingSystems:
          Array.isArray(
            data.topOperatingSystems
          )
            ? data.topOperatingSystems
            : [],

        topReferrers:
          Array.isArray(
            data.topReferrers
          )
            ? data.topReferrers
            : [],

        environments:
          Array.isArray(
            data.environments
          )
            ? data.environments
            : [],

        loading: false,
        error: null,

        since:
          data.period?.since ||
          null,

        until:
          data.period?.until ||
          null,
      });
    } catch (error) {
      console.error(
        "Failed to load analytics:",
        error
      );

      setAnalyticsData(
        (previous) => ({
          ...previous,

          loading: false,

          error:
            error instanceof Error
              ? error.message
              : "Unable to load analytics.",
        })
      );
    }
  }

  useEffect(() => {
    void fetchAnalytics(
      selectedDays
    );
  }, [selectedDays]);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await fetchAnalytics(
        selectedDays
      );
    } finally {
      setRefreshing(false);
    }
  }

  /*
   * ============================================================
   * PERMISSION
   * ============================================================
   */

  if (
    !currentUser ||
    !hasPermission(
      currentUser,
      "can_view_analytics"
    )
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            Access Denied
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            You do not have
            permission to view
            the analytics
            dashboard.
          </p>
        </Card>
      </div>
    );
  }

  /*
   * ============================================================
   * CHART
   *
   * DO NOT REMOVE EITHER SERIES.
   * ============================================================
   */

  const dailyChartData =
    analyticsData.daily.map(
      (item) => ({
        date: item.label,

        pageviews:
          Number(
            item.pageviews || 0
          ),

        visitors:
          Number(
            item.visitors || 0
          ),
      })
    );

  /*
   * ============================================================
   * TOTALS USED FOR DISTRIBUTION
   * ============================================================
   */

  const totalCountryVisitors =
    analyticsData.topCountries.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.visitors || 0
        ),
      0
    );

  const totalDeviceVisitors =
    analyticsData.topDevices.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.visitors || 0
        ),
      0
    );

  const totalBrowserVisitors =
    analyticsData.topBrowsers.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.visitors || 0
        ),
      0
    );

  const totalOSVisitors =
    analyticsData.topOperatingSystems.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.visitors || 0
        ),
      0
    );

  const totalReferrerPageviews =
    analyticsData.topReferrers.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.pageviews || 0
        ),
      0
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-full space-y-6 bg-slate-50/50 p-4 dark:bg-slate-950 md:p-6 lg:p-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <BarChart3 className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                Analytics
              </h1>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Website traffic and
                system activity
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {[7, 14, 30].map(
              (days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setSelectedDays(
                      days
                    )
                  }
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    selectedDays ===
                    days
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {days}d
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={
              handleRefresh
            }
            disabled={
              refreshing ||
              analyticsData.loading
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      {/* DATE RANGE */}

      {analyticsData.since &&
        analyticsData.until && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Local Analytics Â·{" "}
            {formatDate(
              analyticsData.since
            )}{" "}
            â€“{" "}
            {formatDate(
              analyticsData.until
            )}
          </p>
        )}

      {/* ERROR */}

      {analyticsData.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <div className="font-semibold">
            Analytics error
          </div>

          <div className="mt-1">
            {analyticsData.error}
          </div>
        </div>
      )}

      {/* ======================================================
          TOP METRICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Page Views
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {analyticsData.loading
                    ? "â€”"
                    : formatNumber(
                        analyticsData.pageViews
                      )}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 h-1 rounded-full bg-emerald-100 dark:bg-emerald-950">
              <div className="h-full w-2/3 rounded-full bg-emerald-500" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Visitors
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {analyticsData.loading
                    ? "â€”"
                    : formatNumber(
                        analyticsData.visitors
                      )}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 h-1 rounded-full bg-blue-100 dark:bg-blue-950">
              <div className="h-full w-2/3 rounded-full bg-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Homeowners
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(
                    totalHomeowners
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                <Database className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Homeowner masterlist
            </p>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Active Users
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(
                    activeUsers
                  )}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Active system accounts
            </p>
          </div>
        </Card>
      </div>

      {/* ======================================================
          TRAFFIC OVER TIME
          
          BOTH PAGE VIEWS + VISITORS
      ====================================================== */}

      <Card className="overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeader
            icon={
              <TrendingUp className="h-5 w-5" />
            }
            title="Traffic Over Time"
            description="Real daily page views and visitors from the local analytics database"
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          />

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">
                Page Views
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-300">
                Visitors
              </span>
            </div>
          </div>
        </div>

        <div className="h-[390px] p-4 md:p-6">
          {analyticsData.loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Loading daily analytics...
            </div>
          ) : dailyChartData.length ===
            0 ? (
            <EmptyState text="No daily analytics data available yet." />
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={
                  dailyChartData
                }
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "white",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius:
                      "10px",
                    boxShadow:
                      "0 8px 25px rgba(15,23,42,0.08)",
                  }}
                  formatter={(
                    value,
                    name
                  ) => [
                    formatNumber(
                      Number(value)
                    ),
                    name ===
                    "pageviews"
                      ? "Page Views"
                      : "Visitors",
                  ]}
                />

                {/* =================================================
                    PAGE VIEWS â€” KEEP THIS
                ================================================= */}

                <Line
                  type="monotone"
                  dataKey="pageviews"
                  name="Page Views"
                  stroke="#0d9488"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    fill: "#0d9488",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />

                {/* =================================================
                    VISITORS â€” KEEP THIS TOO
                ================================================= */}

                <Line
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    fill: "#2563eb",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 border-t border-slate-200 dark:border-slate-800">
          <div className="border-r border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page Views
            </p>

            <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {formatNumber(
                analyticsData.pageViews
              )}
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visitors
            </p>

            <p className="mt-1 text-lg font-semibold text-blue-600 dark:text-blue-400">
              {formatNumber(
                analyticsData.visitors
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* ======================================================
          DATABASE METRICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Household Members
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(
                  totalHouseholdMembers
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-pink-50 p-3 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Registered Pets
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {formatNumber(
                  totalPets
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ======================================================
          PAGE VIEWS
      ====================================================== */}

      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <SectionHeader
            icon={
              <BarChart3 className="h-5 w-5" />
            }
            title="Pages"
            description="Most visited routes"
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          />
        </div>

        <div className="p-5">
          {analyticsData.topRoutes
            .length === 0 ? (
            <EmptyState text="No route data available." />
          ) : (
            analyticsData.topRoutes
              .slice(0, 10)
              .map(
                (
                  item,
                  index
                ) => (
                  <AnalyticsRow
                    key={`${item.route}-${index}`}
                    index={index}
                    name={getName(
                      item.route,
                      "/"
                    )}
                    value={Number(
                      item.pageviews ||
                        0
                    )}
                    total={
                      analyticsData.pageViews
                    }
                    valueLabel="views"
                  />
                )
              )
          )}
        </div>
      </Card>

      {/* ======================================================
          COUNTRY + REFERRERS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <SectionHeader
              icon={
                <Globe className="h-5 w-5" />
              }
              title="Countries"
              description="Where visitors come from"
              iconClass="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            />
          </div>

          <div className="p-5">
            {analyticsData
              .topCountries
              .length === 0 ? (
              <EmptyState text="No country data available." />
            ) : (
              analyticsData.topCountries
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <AnalyticsRow
                      key={`${item.country}-${index}`}
                      index={
                        index
                      }
                      name={getName(
                        item.country
                      )}
                      value={Number(
                        item.visitors ||
                          0
                      )}
                      total={
                        totalCountryVisitors
                      }
                      valueLabel="visitors"
                    />
                  )
                )
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <SectionHeader
              icon={
                <TrendingUp className="h-5 w-5" />
              }
              title="Referrers"
              description="Traffic sources"
              iconClass="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400"
            />
          </div>

          <div className="p-5">
            {analyticsData
              .topReferrers
              .length === 0 ? (
              <EmptyState text="No referrer data available." />
            ) : (
              analyticsData.topReferrers
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <AnalyticsRow
                      key={`${item.referrerHostname}-${index}`}
                      index={
                        index
                      }
                      name={getName(
                        item.referrerHostname,
                        "Direct"
                      )}
                      value={Number(
                        item.pageviews ||
                          0
                      )}
                      total={
                        totalReferrerPageviews
                      }
                      valueLabel="views"
                    />
                  )
                )
            )}
          </div>
        </Card>
      </div>

      {/* ======================================================
          DEVICE + BROWSER
      ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <SectionHeader
              icon={
                <Monitor className="h-5 w-5" />
              }
              title="Devices"
              description="Visitor device distribution"
              iconClass="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
            />
          </div>

          <div className="p-5">
            {analyticsData
              .topDevices
              .length === 0 ? (
              <EmptyState text="No device data available." />
            ) : (
              analyticsData.topDevices
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <AnalyticsRow
                      key={`${item.deviceType}-${index}`}
                      index={
                        index
                      }
                      name={getName(
                        item.deviceType
                      )}
                      value={Number(
                        item.visitors ||
                          0
                      )}
                      total={
                        totalDeviceVisitors
                      }
                      valueLabel="visitors"
                    />
                  )
                )
            )}
          </div>
        </Card>

        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <SectionHeader
              icon={
                <Chrome className="h-5 w-5" />
              }
              title="Browsers"
              description="Visitor browser distribution"
              iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            />
          </div>

          <div className="p-5">
            {analyticsData
              .topBrowsers
              .length === 0 ? (
              <EmptyState text="No browser data available." />
            ) : (
              analyticsData.topBrowsers
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <AnalyticsRow
                      key={`${item.browserName}-${index}`}
                      index={
                        index
                      }
                      name={getName(
                        item.browserName
                      )}
                      value={Number(
                        item.visitors ||
                          0
                      )}
                      total={
                        totalBrowserVisitors
                      }
                      valueLabel="visitors"
                    />
                  )
                )
            )}
          </div>
        </Card>
      </div>

      {/* ======================================================
          OPERATING SYSTEM
      ====================================================== */}

      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <SectionHeader
            icon={
              <Monitor className="h-5 w-5" />
            }
            title="Operating Systems"
            description="Visitor operating system distribution"
            iconClass="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-x-8 px-5 py-2 md:grid-cols-2">
          {analyticsData
            .topOperatingSystems
            .length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState text="No operating system data available." />
            </div>
          ) : (
            analyticsData.topOperatingSystems
              .slice(0, 10)
              .map(
                (
                  item,
                  index
                ) => (
                  <AnalyticsRow
                    key={`${item.osName}-${index}`}
                    index={
                      index
                    }
                    name={getName(
                      item.osName
                    )}
                    value={Number(
                      item.visitors ||
                        0
                    )}
                    total={
                      totalOSVisitors
                    }
                    valueLabel="visitors"
                  />
                )
              )
          )}
        </div>
      </Card>

      {/* ======================================================
          STATUS
      ====================================================== */}

      <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Local Analytics
                connected
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traffic data is queried directly from the local MySQL analytics database.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedDays}-day range
          </div>
        </div>
      </Card>
    </div>
  );
}
