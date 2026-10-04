import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("delete idle SMS sessions", { hours: 1 }, internal.phoneSessions.deleteIdleSessions);

export default crons;
