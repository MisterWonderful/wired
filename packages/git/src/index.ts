import simpleGit, { SimpleGit, StatusResult } from "simple-git";

export interface GitRepoInfo {
  isRepo: boolean;
  branch: string | null;
  defaultBranch: string | null;
  isDirty: boolean;
  dirtyFiles: string[];
  stagedFiles: string[];
  recentCommits: { hash: string; message: string; author?: string; date?: string }[];
  remoteUrl: string | null;
}

export async function getGitInfo(localPath: string): Promise<GitRepoInfo> {
  try {
    const git: SimpleGit = simpleGit(localPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return repoInfo(false);
    }

    const [branchResult, status, logResult] = await Promise.all([
      git.branch(),
      git.status(),
      git.log({ maxCount: 20 }),
    ]);

    let remoteUrl: string | null = null;
    try {
      const remotes = await git.getRemotes(true);
      if (remotes.length > 0 && remotes[0].refs.fetch) {
        remoteUrl = remotes[0].refs.fetch;
      }
    } catch {}

    return {
      isRepo: true,
      branch: branchResult.current,
      defaultBranch: branchResult.current,
      isDirty: status.files.length > 0,
      dirtyFiles: status.modified,
      stagedFiles: status.staged || [],
      recentCommits: logResult.all.slice(0, 15).map((c: { hash: string; message: string; author_name: string; date: string }) => ({
        hash: c.hash.slice(0, 7),
        message: c.message,
        author: c.author_name,
        date: c.date,
      })),
      remoteUrl,
    };
  } catch {
    return repoInfo(false);
  }
}

function repoInfo(isRepo: boolean): GitRepoInfo {
  return {
    isRepo,
    branch: null,
    defaultBranch: null,
    isDirty: false,
    dirtyFiles: [],
    stagedFiles: [],
    recentCommits: [],
    remoteUrl: null,
  };
}

export async function isGitRepo(path: string): Promise<boolean> {
  try {
    return await simpleGit(path).checkIsRepo();
  } catch {
    return false;
  }
}

export async function getRepoUrl(localPath: string): Promise<string | null> {
  try {
    const git: SimpleGit = simpleGit(localPath);
    const remotes = await git.getRemotes(true);
    if (remotes.length > 0 && remotes[0].refs.fetch) {
      return remotes[0].refs.fetch;
    }
  } catch {}
  return null;
}
