"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Trash2, Globe, EyeOff, Upload, Video, FileText } from "lucide-react";

interface Lesson { id: string; title: string; type: string; isFree: boolean; muxPlaybackId: string | null; order: number }
interface Module { id: string; title: string; order: number; lessons: Lesson[] }
interface Course {
  id: string; title: string; description: string | null; level: string; priceModel: string;
  price: number; currency: string; status: string; modules: Module[];
}

export function CourseEditorClient({ course }: { course: Course }) {
  const [data, setData] = useState(course);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const router = useRouter();

  async function saveMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/courses/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          description: fd.get("description"),
          level: fd.get("level"),
          price: Number(fd.get("price")),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Curso actualizado");
      router.refresh();
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function addModule() {
    const title = prompt("Título del módulo:");
    if (!title) return;
    const res = await fetch(`/api/teacher/courses/${data.id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return toast.error("Error al crear módulo");
    const { module } = await res.json();
    setData((d) => ({ ...d, modules: [...d.modules, { ...module, lessons: [] }] }));
    toast.success("Módulo creado");
  }

  async function addLesson(moduleId: string) {
    const title = prompt("Título de la lección:");
    if (!title) return;
    const res = await fetch(`/api/teacher/courses/${data.id}/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type: "VIDEO" }),
    });
    if (!res.ok) return toast.error("Error al crear lección");
    const { lesson } = await res.json();
    setData((d) => ({
      ...d,
      modules: d.modules.map((m) => m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m),
    }));
    toast.success("Lección creada");
  }

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm("¿Eliminar lección?")) return;
    const res = await fetch(`/api/teacher/courses/${data.id}/modules/${moduleId}/lessons/${lessonId}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Error al eliminar");
    setData((d) => ({
      ...d,
      modules: d.modules.map((m) => m.id === moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m),
    }));
    toast.success("Lección eliminada");
  }

  async function togglePublish() {
    const isPublished = data.status === "PUBLISHED";
    setPublishing(true);
    try {
      const res = await fetch(`/api/teacher/courses/${data.id}/publish`, {
        method: isPublished ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const { course: updated } = await res.json();
      setData((d) => ({ ...d, status: updated.status }));
      toast.success(isPublished ? "Curso despublicado" : "Curso publicado");
    } catch (err: any) {
      toast.error(err.message ?? "Error al publicar");
    } finally {
      setPublishing(false);
    }
  }

  async function uploadVideo(moduleId: string, lessonId: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const toastId = toast.loading("Obteniendo URL de subida...");
      try {
        const urlRes = await fetch("/api/mux", { method: "POST" });
        if (!urlRes.ok) throw new Error("No se pudo obtener URL de subida");
        const { url, uploadId } = await urlRes.json();

        toast.loading("Subiendo video...", { id: toastId });
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) throw new Error("Error al subir video");

        await fetch(`/api/teacher/courses/${data.id}/modules/${moduleId}/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ muxAssetId: uploadId }),
        });

        toast.success("Video subido. El procesamiento puede tardar unos minutos.", { id: toastId });
      } catch (err: any) {
        toast.error(err.message ?? "Error al subir video", { id: toastId });
      }
    };
    input.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Editar curso</h1>
        <button
          onClick={togglePublish}
          disabled={publishing}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            data.status === "PUBLISHED"
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {data.status === "PUBLISHED" ? (
            <><EyeOff className="w-4 h-4" /> Despublicar</>
          ) : (
            <><Globe className="w-4 h-4" /> Publicar</>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Información general</h2>
        <form onSubmit={saveMeta} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input name="title" required defaultValue={data.title} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="description" defaultValue={data.description ?? ""} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel</label>
              <select name="level" defaultValue={data.level} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="PRINCIPIANTE">Principiante</option>
                <option value="INTERMEDIO">Intermedio</option>
                <option value="AVANZADO">Avanzado</option>
                <option value="EXPERTO">Experto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio (ARS)</label>
              <input name="price" type="number" min={0} step="0.01" defaultValue={data.price} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Contenido del curso</h2>
          <button onClick={addModule} className="flex items-center gap-1 text-sm bg-navy-900 text-white rounded-lg px-3 py-1.5 hover:bg-navy-800">
            <Plus className="w-3.5 h-3.5" /> Módulo
          </button>
        </div>

        {data.modules.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Sin módulos. Agrega el primero.</p>
        ) : (
          <div className="space-y-3">
            {data.modules.map((mod) => {
              const expanded = expandedModules.has(mod.id);
              return (
                <div key={mod.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedModules((s) => {
                      const next = new Set(s);
                      next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                      return next;
                    })}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className="font-medium text-sm text-gray-800">{mod.title}</span>
                      <span className="text-xs text-gray-400">({mod.lessons.length} lecciones)</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="divide-y">
                      {mod.lessons.map((lesson) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                          {lesson.type === "VIDEO" ? (
                            <Video className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 flex-1">{lesson.title}</span>
                          {lesson.muxPlaybackId ? (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Video listo</span>
                          ) : lesson.type === "VIDEO" ? (
                            <button
                              onClick={() => uploadVideo(mod.id, lesson.id)}
                              className="flex items-center gap-1 text-xs text-navy-700 bg-navy-50 px-2 py-0.5 rounded-full hover:bg-navy-100"
                            >
                              <Upload className="w-3 h-3" /> Subir video
                            </button>
                          ) : null}
                          {lesson.isFree && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Gratis</span>
                          )}
                          <button onClick={() => deleteLesson(mod.id, lesson.id)} className="p-1 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="px-4 py-2">
                        <button onClick={() => addLesson(mod.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-navy-700">
                          <Plus className="w-3 h-3" /> Agregar lección
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
