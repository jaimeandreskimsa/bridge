import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, ChevronLeft } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { GroupJoinButton } from "./join-button";

interface Props { params: Promise<{ groupId: string }> }

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params;
  const session = await auth();

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true, role: true } } }, take: 20 },
      _count: { select: { members: true, posts: true } },
    },
  });
  if (!group) notFound();

  const isMember = session?.user
    ? group.members.some((m) => m.userId === session.user.id)
    : false;

  const posts = isMember ? await db.feedPost.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
  }) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/grupos" className="flex items-center gap-1 text-sm text-navy-700 hover:underline mb-4">
        <ChevronLeft className="w-4 h-4" /> Grupos
      </Link>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && <p className="text-gray-600 mt-1">{group.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{group._count.members} miembros</span>
              <span>{group._count.posts} posts</span>
            </div>
          </div>
          {session?.user && !isMember && (
            <GroupJoinButton groupId={groupId} />
          )}
          {isMember && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-full">Miembro</span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Posts */}
        <div className="lg:col-span-2 space-y-4">
          {!isMember && !session?.user && (
            <div className="bg-navy-50 border border-navy-200 rounded-xl p-6 text-center">
              <p className="text-navy-800 font-medium">Únete al grupo para ver y participar en el contenido.</p>
              <Link href="/login" className="inline-block mt-3 px-4 py-2 bg-navy-900 text-white text-sm rounded-lg">Iniciar sesión</Link>
            </div>
          )}
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-navy-200 flex items-center justify-center text-xs font-bold text-navy-800">
                  {getInitials(post.user.name ?? "?")}
                </div>
                <div>
                  <p className="text-sm font-medium">{post.user.name}</p>
                  <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString("es-AR")}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700">{post.content}</p>
            </div>
          ))}
        </div>

        {/* Members sidebar */}
        <div className="bg-white rounded-xl border p-4 h-fit">
          <h3 className="font-semibold text-gray-900 mb-3">Miembros ({group._count.members})</h3>
          <ul className="space-y-2">
            {group.members.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-navy-200 flex items-center justify-center text-xs font-bold text-navy-800">
                  {getInitials(m.user.name ?? "?")}
                </div>
                <span className="text-sm text-gray-700">{m.user.name}</span>
                {m.user.role === "PROFESOR" && (
                  <span className="text-xs bg-navy-100 text-navy-700 px-1 rounded">Prof</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
