import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { getEngagementContext, type EngagementContext } from "@/lib/engagementContext";

/**
 * Returns the resolved engagement context (entity, period, framework,
 * Trial Balance benchmarks, materiality, FSAs, revenue streams, team)
 * for the engagement currently in the URL.
 *
 * Worksheets should use this to PRE-FILL fields (still editable by the
 * preparer). Always defaults gracefully when no engagementId is present.
 */
export function useEngagementContext(): EngagementContext {
 const { engagementId } = useParams<{ engagementId: string }>();
 return useMemo(() => getEngagementContext(engagementId), [engagementId]);
}
