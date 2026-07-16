import type { ConversionJob, ConversionError, ConversionResult } from "./conversion"

export interface QueueState {
  jobs: ConversionJob[]
  startedAt: number | null
  completedAt: number | null
}

export type QueueAction =
  | { type: "ADD_JOBS"; jobs: ConversionJob[] }
  | { type: "START_JOB"; id: string }
  | { type: "COMPLETE_JOB"; id: string; result: ConversionResult }
  | { type: "FAIL_JOB"; id: string; error: ConversionError }
  | { type: "RESET" }
