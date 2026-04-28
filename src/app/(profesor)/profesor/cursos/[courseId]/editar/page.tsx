import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseEditorClient } from "./course-editor-client";

export default async function EditarCursoPage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await auth();
  if (!session?.user || !["PROFESOR", "MODERADOR", "SUPERADMIN"].includes(session.user.role as string)) {
    redirect("/login");
  }
  const { courseId } = await params;

  const teacher = await db.teacherProfile.findUnique({ where: { userId: session.user.id } });
  if (!teacher) redirect("/perfil/solicitar-profesor");

  const course = await db.course.findFirst({
    where: { id: courseId, teacherProfileId: teacher.id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-5">
        <Link href="/profesor/cursos" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Mis cursos
        </Link>
      </div>
      <CourseEditorClient course={course as any} />
    </div>
  );
}
