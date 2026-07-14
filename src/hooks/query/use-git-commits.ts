import { useQuery } from "@tanstack/react-query";

import AgentServerRuntimeService from "#/api/runtime-service/agent-server-runtime-service";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useRuntimeIsReady } from "#/hooks/use-runtime-is-ready";

export interface CommitInfo {
  /** Full commit SHA. */
  sha: string;
  /** Commit author name. */
  author: string;
  /** Commit time in epoch milliseconds. */
  timestamp: number;
  /** First line of the commit message. */
  subject: string;
  /** True when the commit was created via the Checkpoint button. */
  isCheckpoint: boolean;
}

const FIELD_SEP = "\u001f"; // ASCII unit separator (%x1f) — safe in commit data
const COMMIT_LIMIT = 100;
export const GIT_COMMITS_LIMIT = COMMIT_LIMIT;

// `%at` is the author date as a Unix timestamp; fields are unit-separated and
// records newline-separated. `%s` (subject) is single-line so records parse
// cleanly on `\n`.
const GIT_LOG_COMMAND = `git log -n ${COMMIT_LIMIT} --pretty=format:%H%x1f%an%x1f%at%x1f%s`;

function parseCommits(stdout: string): CommitInfo[] {
  return stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [sha = "", author = "", at = "", subject = ""] =
        line.split(FIELD_SEP);
      return {
        sha,
        author,
        timestamp: Number(at) * 1000,
        subject,
        isCheckpoint: subject.startsWith("Checkpoint:"),
      };
    })
    .filter((commit) => commit.sha.length > 0);
}

/**
 * Lists the working-directory repository's commits (latest {@link COMMIT_LIMIT}),
 * newest first, for the Checkpoints tab.
 *
 * Runs `git log` via the runtime command primitive. Unlike
 * {@link import("./use-has-git-commits").useHasGitCommits}, this is enabled on
 * BOTH local and cloud backends: it is user-facing, read-only, and this hook is
 * only mounted while the Checkpoints tab is open (the tab component is lazy),
 * so there is no background shell traffic when the tab is closed.
 *
 * When the working dir is not a git repository or has no commits yet (unborn
 * branch), `git log` exits non-zero and this returns an empty list.
 */
export function useGitCommits(options?: { enabled?: boolean }) {
  const { data: conversation } = useActiveConversation();
  const runtimeIsReady = useRuntimeIsReady();

  const conversationId = conversation?.id;
  const conversationUrl = conversation?.conversation_url;
  const sessionApiKey = conversation?.session_api_key;
  const workingDir = conversation?.workspace?.working_dir?.trim();

  const enabled =
    (options?.enabled ?? true) &&
    runtimeIsReady &&
    !!conversationId &&
    !!workingDir;

  const query = useQuery<CommitInfo[]>({
    queryKey: [
      "git-commits",
      conversationId,
      conversationUrl,
      sessionApiKey,
      workingDir,
    ],
    queryFn: async () => {
      const result = await AgentServerRuntimeService.executeCommand(
        conversationUrl,
        sessionApiKey,
        GIT_LOG_COMMAND,
        workingDir,
        10,
      );
      // Non-zero exit = not a repo / unborn branch / git error — all mean
      // "no checkpoints to show".
      if (result.exit_code !== 0) return [];
      return parseCommits(result.stdout);
    },
    enabled,
    retry: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    meta: { disableToast: true },
  });

  return {
    commits: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}
