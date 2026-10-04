import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("delete disease reports older than 14 days", { hours: 6 }, internal.neighbourAlerts.deleteExpiredReports);

export default crons;
