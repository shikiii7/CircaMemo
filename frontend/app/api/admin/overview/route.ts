import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { loadAdminOverview } from "@/lib/adminOverview";

/** 后台概览：用户列表 + 全部录入记录 + 统计。 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ success: false, error: "需要管理员权限" }, { status: 403 });
  }

  try {
    const overview = await loadAdminOverview();
    return NextResponse.json({ success: true, ...overview });
  } catch (error) {
    console.error("admin overview api error:", error);
    return NextResponse.json(
      { success: false, error: "读取后台数据失败" },
      { status: 500 },
    );
  }
}
