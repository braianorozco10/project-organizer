import ExcelJS from "exceljs";

import { getProject } from "@/lib/data";
import { getSession } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strips characters that browsers or filesystems object to in a download name. */
function safeFilename(name: string): string {
  const cleaned = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return cleaned || "project";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.cloudId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const project = await getProject(session, id);
  if (!project) return new Response("Not found", { status: 404 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Project Organizer";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(project.name.slice(0, 31) || "Project");

  sheet.columns = [
    { header: "Ticket", key: "ticket", width: 16 },
    { header: "Title", key: "title", width: 56 },
    { header: "Status", key: "status", width: 18 },
    { header: "Assignee", key: "assignee", width: 22 },
    { header: "Last update", key: "updated", width: 20 },
    { header: "Completion", key: "completion", width: 14 },
    { header: "Link", key: "link", width: 46 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const task of project.tasks) {
    const row = sheet.addRow({
      // Indent is a visual hint in the app; carry it across as leading spaces
      // so the hierarchy survives the trip into Excel.
      ticket: `${"    ".repeat(task.depth)}${task.issueKey}`,
      title: task.title ?? "",
      status: task.status ?? "",
      assignee: task.assignee ?? "",
      updated: task.jiraUpdatedAt ?? "",
      completion: task.completion / 100,
      link: task.url,
    });

    row.getCell("completion").numFmt = "0%";
    if (task.jiraUpdatedAt) row.getCell("updated").numFmt = "yyyy-mm-dd hh:mm";
    row.getCell("link").value = { text: task.url, hyperlink: task.url };
    row.getCell("link").font = { color: { argb: "FF2F6F4F" }, underline: true };
  }

  sheet.autoFilter = { from: "A1", to: { row: 1, column: sheet.columns.length } };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${safeFilename(project.name)}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
