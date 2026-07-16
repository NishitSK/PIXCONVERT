import type { QueueState, QueueAction } from "@/types/queue"

export const initialQueueState: QueueState = {
  jobs: [],
  startedAt: null,
  completedAt: null,
}

export function jobQueueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "ADD_JOBS":
      return {
        ...state,
        jobs: [...state.jobs, ...action.jobs],
        startedAt: state.startedAt ?? Date.now(),
        completedAt: null,
      }

    case "START_JOB":
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === action.id ? { ...j, status: "running", startedAt: Date.now() } : j
        ),
      }

    case "COMPLETE_JOB": {
      const jobs = state.jobs.map((j) =>
        j.id === action.id
          ? { ...j, status: "completed" as const, result: action.result, completedAt: Date.now() }
          : j
      )
      const allDone = jobs.every((j) => j.status === "completed" || j.status === "failed")
      return {
        ...state,
        jobs,
        completedAt: allDone ? Date.now() : null,
      }
    }

    case "FAIL_JOB": {
      const jobs = state.jobs.map((j) =>
        j.id === action.id
          ? { ...j, status: "failed" as const, error: action.error, completedAt: Date.now() }
          : j
      )
      const allDone = jobs.every((j) => j.status === "completed" || j.status === "failed")
      return {
        ...state,
        jobs,
        completedAt: allDone ? Date.now() : null,
      }
    }

    case "RESET":
      return initialQueueState

    default:
      return state
  }
}
