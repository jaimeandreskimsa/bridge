import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, BookOpen, Play, Users } from "lucide-react";

export const metadata = { title: "Mis Favoritos" };

export default async function FavoritosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const courseIds = favorites.filter((f) => f.entityType === "COURSE").map((f) => f.entityId);
  const lessonIds = favorites.filter((f) => f.entityType === "LESSON").map((f) => f.entityId);
  const postIds = favorites.filter((f) => f.entityType === "POST").map((f) => f.entityId);

  const [courses, lessons, posts] = await Promise.all([
    courseIds.length
      ? db.course.findMany({
          where: { id: { in: courseIds } },
          include: { teacherProfile: { include: { user: { select: { name: true } } } } },
        })
      : Promise.resolve([]),
    lessonIds.length
      ? db.lesson.findMany({
          where: { id: { in: lessonIds } },
          include: { module: { include: { course: { select: { id: true, title: true } } } } },
        })
      : Promise.resolve([]),
    postIds.length
      ? db.feedPost.findMany({
          where: { id: { in: postIds } },
          include: { user: { select: { name: true } } },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Heart className="w-6 h-6 text-red-500" /> Mis Favoritos
      </h1>

      {favorites.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Heart className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>No tienes favoritos guardados.</p>
          <p className="text-sm mt-1">Usa el ♥ en cursos, clases y posts para guardarlos aquí.</p>
        </div>
      )}

      {courses.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4" /> Cursos guardados ({courses.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {courses.map((c) => (
              <Link key={c.id} href={`/cursos/${c.id}`}
                className="flex gap-3 p-3 bg-white rounded-xl border hover:border-navy-300 transition-colors">
                <div className="w-20 h-16 rounded-lg bg-navy-100 shrink-0 overflow-hidden">
                  {c.thumbnail && <img src={c.thumbnail} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-2 text-sm">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.teacherProfile.user.name}</p>
                  <p className="text-xs text-navy-700 font-semibold mt-1">
                    {c.priceModel === "FREE" ? "Gratuito" : c.price ? `$${c.price}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {lessons.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Play className="w-4 h-4" /> Clases guardadas ({lessons.length})
          </h2>
          <div className="space-y-2">
            {lessons.map((l) => (
              <Link key={l.id} href={`/cursos/${l.module.course.id}/${l.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border hover:border-navy-300 transition-colors">
                <Play className="w-4 h-4 text-navy-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{l.title}</p>
                  <p className="text-xs text-gray-500">{l.module.course.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" /> Posts guardados ({posts.length})
          </h2>
          <div className="space-y-2">
            {posts.map((p) => (
              <Link key={p.id} href={`/feed?post=${p.id}`}
                className="flex items-start gap-3 p-3 bg-white rounded-xl border hover:border-navy-300 transition-colors">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">{p.user.name}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{p.content}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
