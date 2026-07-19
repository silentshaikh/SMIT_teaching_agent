import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/api";
import type { AssignmentReport } from "@/lib/types";

interface ReportPollerResult {
  data: AssignmentReport | undefined;
  isLoading: boolean;
  isFailed: boolean;
  error: Error | null;
}

export function useReportPoller(
  submissionId: string | null,
  status: string
): ReportPollerResult {
  const query = useQuery<AssignmentReport>({
    queryKey: ["report", submissionId],
    queryFn: () => getReport(submissionId!),
    refetchInterval: (query) => {
      return query.state.data ? false : 2000;
    },
    enabled: !!submissionId && status === "processing",
  });

  const isFailed =
    query.data?.status === "failed" ||
    (!query.isLoading && !query.isFetching && status !== "processing" && status !== "complete" && !!submissionId);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFailed,
    error: query.error,
  };
}
