import { v4 as uuidv4 } from "uuid"
import type { IngestedFile } from "@/types/upload"
import type { ConversionJob, ConversionOptions } from "@/types/conversion"
import { validateFile } from "@/lib/conversion/validators"

export function createJobs(
  files: IngestedFile[],
  options: ConversionOptions
): ConversionJob[] {
  const seenNames = new Set<string>()

  return files.map((ingestedFile) => {
    const validation = validateFile(ingestedFile, seenNames)

    if (!validation.valid) {
      return {
        id: uuidv4(),
        filename: ingestedFile.file.name,
        relativePath: ingestedFile.relativePath,
        options,
        status: "failed" as const,
        error: validation.error,
      }
    }

    return {
      id: uuidv4(),
      filename: ingestedFile.file.name,
      relativePath: ingestedFile.relativePath,
      options,
      status: "pending" as const,
      _ingestedFile: ingestedFile,
    }
  }) as ConversionJob[]
}

// Attach file data needed for upload — stored separately from the job type
export interface JobWithFile extends ConversionJob {
  _ingestedFile?: IngestedFile
}
