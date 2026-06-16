import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/api";
import type { AssignmentReport } from "@/lib/types";

export function useReportPoller(
  submissionId: string | null,
  status: string
) {
  return useQuery<AssignmentReport>({
    queryKey: ["report", submissionId],
    queryFn: () => getReport(submissionId!),
    refetchInterval: (query) => {
      return query.state.data ? false : 2000;
    },
    enabled: !!submissionId && status === "processing",
  });
}
