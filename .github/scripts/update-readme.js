import { Octokit } from "@octokit/rest";
import fs from "fs/promises";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getMostActiveRepo() {
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: "pushed",
    per_page: 100
  });

  const mostActiveRepo = repos.reduce((prev, current) => {
    return (prev.pushed_at > current.pushed_at) ? prev : current;
  });

  return mostActiveRepo;
}

async function getTopProjects() {
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100
  });

  const topProjects = repos
    .filter(repo => !repo.fork && !repo.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10)
    .map(repo => `- [${repo.name}](${repo.html_url}) - ${repo.description || 'No description'}`);

  return topProjects.join('\n');
}

async function getRecentProjects() {
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    sort: "pushed",
    per_page: 100
  });

  const recentProjects = repos
    .filter(repo => !repo.fork && !repo.archived && repo.name !== 'anbuinfosec')
    .slice(0, 3)
    .map(repo => `- [${repo.name}](${repo.html_url}) - ${repo.description || 'No description'}`);

  return recentProjects.join('\n');
}

async function updateReadme() {
  const [topProjects, mostActiveRepo, recentProjects] = await Promise.all([
    getTopProjects(),
    getMostActiveRepo(),
    getRecentProjects()
  ]);
  
  let readme = await fs.readFile('README.md', 'utf8');
  
  // Update top projects
  const topProjectsStartToken = '<!-- TOP-PROJECTS-LIST:START -->';
  const topProjectsEndToken = '<!-- TOP-PROJECTS-LIST:END -->';
  const newTopProjectsContent = `${topProjectsStartToken}\n${topProjects}\n${topProjectsEndToken}`;
  
  readme = readme.replace(
    new RegExp(`${topProjectsStartToken}[\\s\\S]*${topProjectsEndToken}`),
    newTopProjectsContent
  );

  // Update most active repository
  const mostActiveRepoRegex = /<a href="https:\/\/github\.com\/anbuinfosec\/.*">\s*<img src="https:\/\/github-readme-stats\.vercel\.app\/api\/pin\/\?username=anbuinfosec&repo=.*&theme=radical" alt="Most Active Repository" \/>\s*<\/a>/;
  const newMostActiveRepoContent = `<a href="${mostActiveRepo.html_url}">\n    <img src="https://github-readme-stats.vercel.app/api/pin/?username=anbuinfosec&repo=${mostActiveRepo.name}&theme=radical" alt="Most Active Repository" />\n  </a>`;

  readme = readme.replace(mostActiveRepoRegex, newMostActiveRepoContent);

  // Update recent projects
  const recentProjectsStartToken = '<!-- RECENT-PROJECTS:START -->';
  const recentProjectsEndToken = '<!-- RECENT-PROJECTS:END -->';
  const newRecentProjectsContent = `${recentProjectsStartToken}\n${recentProjects}\n${recentProjectsEndToken}`;
  
  readme = readme.replace(
    new RegExp(`${recentProjectsStartToken}[\\s\\S]*${recentProjectsEndToken}`),
    newRecentProjectsContent
  );
  
  await fs.writeFile('README.md', readme);
}

updateReadme().catch(console.error);
