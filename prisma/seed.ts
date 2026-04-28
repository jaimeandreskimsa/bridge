import { PrismaClient, Role, AccountStatus, PostType, PostVisibility, HandDifficulty, MessageType, PriceModel, CourseStatus, LessonStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const users = [
  {
    name: "Alumno Demo",
    email: "alumno@bridge.com",
    username: "alumno_demo",
    role: Role.ALUMNO,
    password: "alumno123",
  },
  {
    name: "Profesor Demo",
    email: "profesor@bridge.com",
    username: "profesor_demo",
    role: Role.PROFESOR,
    password: "profesor123",
  },
  {
    name: "Moderador Demo",
    email: "moderador@bridge.com",
    username: "moderador_demo",
    role: Role.MODERADOR,
    password: "moderador123",
  },
  {
    name: "Superadmin Demo",
    email: "superadmin@bridge.com",
    username: "superadmin_demo",
    role: Role.SUPERADMIN,
    password: "superadmin123",
  },
];

async function main() {
  console.log("Seeding users...");

  const createdUsers: Record<string, string> = {};

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
      },
      create: {
        name: u.name,
        email: u.email,
        username: u.username,
        passwordHash,
        role: u.role,
        status: AccountStatus.ACTIVE,
        emailVerified: new Date(),
      },
    });

    createdUsers[u.role] = user.id;
    console.log(`  ✓ ${user.role}: ${user.email} (pwd: ${u.password})`);
  }

  // ── Feed posts ────────────────────────────────────────────────────────────
  console.log("\nSeeding feed posts...");

  const feedPosts = [
    {
      userId: createdUsers["ALUMNO"],
      content:
        "¡Empecé a estudiar bridge hace tres semanas y ya puedo reconocer los patrones de la apertura de 1NT! La plataforma tiene recursos increíbles. ¿Algún consejo para aprender las convenciones básicas más rápido? #bridge #principiante",
      type: PostType.TEXT,
      visibility: PostVisibility.PUBLIC,
      hashtags: ["bridge", "principiante"],
    },
    {
      userId: createdUsers["PROFESOR"],
      content:
        "Mano de estudio 🎴\n\nHoy analizamos una subasta complicada de 3NT. Norte abre 1♠, Sur responde 2♣ (Drury inverso), Norte rebid 2♠... ¿qué hace Sur ahora con ♠Ax ♥KQx ♦AJx ♣QJxx?\n\nLa respuesta correcta es 4NT (Blackwood) para explorar el slam. ¡Compartan su razonamiento en los comentarios! #enseñanza #bridge #slam",
      type: PostType.TEXT,
      visibility: PostVisibility.PUBLIC,
      hashtags: ["enseñanza", "bridge", "slam"],
    },
    {
      userId: createdUsers["MODERADOR"],
      content:
        "📢 Recordatorio: El próximo torneo mensual de la comunidad Bridge Academy es el sábado 2 de mayo a las 15:00hs (UTC-3). Inscripciones abiertas hasta el viernes. ¡Anotense en el grupo de Torneos! #torneo #comunidad #bridgeacademy",
      type: PostType.TEXT,
      visibility: PostVisibility.PUBLIC,
      hashtags: ["torneo", "comunidad", "bridgeacademy"],
    },
    {
      userId: createdUsers["SUPERADMIN"],
      content:
        "🚀 ¡Bienvenidos a Bridge Academy! Estamos construyendo la mejor plataforma de bridge en español. En las próximas semanas lanzamos: cursos con video HD, análisis de manos con IA, torneos online y mucho más. ¡Seguinos para estar al tanto! #bridgeacademy #launch",
      type: PostType.TEXT,
      visibility: PostVisibility.PUBLIC,
      hashtags: ["bridgeacademy", "launch"],
    },
  ];

  for (const post of feedPosts) {
    await prisma.feedPost.create({ data: post });
    console.log(`  ✓ Feed post de ${post.userId.slice(0, 8)}...`);
  }

  // ── Daily Hands ───────────────────────────────────────────────────────────
  console.log("\nSeeding manos del día...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyHands = [
    {
      date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      title: "La apertura de 1NT — ¿Cuándo aceptar la invitación?",
      difficulty: HandDifficulty.BEGINNER,
      pbnData: `[Event "Mano del Día"]
[Site "Bridge Academy"]
[Date "2026.04.25"]
[Board "1"]
[Deal "N:AQ5.KQ2.A84.T962 K87.A65.KJ73.A83 JT94.J98.T965.K4 632.T743.Q2.QJ75"]
[Dealer "N"]
[Vulnerable "None"]`,
      explanation:
        "Con 8 puntos y buena distribución, Sur debe aceptar la invitación a 3NT. La mano Norte (15-17 PH) + los 8 PH de Sur dan chances reales de jugar 3NT. La clave está en reconocer que puntos de honores combinados con distribución equilibrada favorecen el contrato de notrump.",
      correctAnswer: "3NT",
      options: { choices: ["2NT (paso)", "3NT (acepto)", "3♠ (muestra mayor)", "4NT (cuantitativo)"] },
      curatorId: createdUsers["SUPERADMIN"],
      publishedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      title: "Defensa activa vs pasiva — El papel del dos de pique",
      difficulty: HandDifficulty.INTERMEDIATE,
      pbnData: `[Event "Mano del Día"]
[Site "Bridge Academy"]
[Date "2026.04.26"]
[Board "2"]
[Deal "N:KQJ8.AK.A743.K85 A94.Q9875.K62.76 T72.JT6.QJ98.AQ3 653.432.T5.JT942"]
[Dealer "E"]
[Vulnerable "NS"]`,
      explanation:
        "Este es un caso clásico de defensa activa. Con el Rey de pique en el muerto, el defensor Oeste debe atacar piques inmediatamente antes de que el declarante establezca los tréboles. Una defensa pasiva en corazones regala el contrato. La lógica: atacar donde el muerto es débil, no donde es fuerte.",
      correctAnswer: "Dos de pique (defensa activa)",
      options: {
        choices: [
          "As de pique (tomar el control)",
          "Dos de pique (defensa activa)",
          "Siete de corazón (palo de ataque)",
          "Seis de trébol (palo seguro)",
        ],
      },
      curatorId: createdUsers["SUPERADMIN"],
      publishedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      date: today,
      title: "Squeeze simple en notrump — Ejecutando el apriete",
      difficulty: HandDifficulty.ADVANCED,
      pbnData: `[Event "Mano del Día"]
[Site "Bridge Academy"]
[Date "2026.04.27"]
[Board "3"]
[Deal "N:AKQ.AK2.AKQ2.A32 JT9.Q876.JT98.K7 8765.543.543.QJ6 432.JT9.76.T9854"]
[Dealer "S"]
[Vulnerable "EW"]`,
      explanation:
        "El declarante en 7NT tiene 12 levadas seguras. La 13ª llega mediante un squeeze simple contra Oeste, quien guarda tanto corazones (para cubrir el K2 de Norte) como tréboles (para cubrir el As de Sur). Al jugar los ases y reyes de piques y diamantes primero, Oeste queda sin descarte en la última carta.",
      correctAnswer: "Jugar As-Rey-Dama de piques primero (squeeze)",
      options: {
        choices: [
          "Jugar corazones primero y esperar el error",
          "Jugar As-Rey-Dama de piques primero (squeeze)",
          "Probar el finesse de trébol",
          "Jugar diamantes y esperar partición 3-3",
        ],
      },
      curatorId: createdUsers["SUPERADMIN"],
      publishedAt: today,
    },
  ];

  for (const hand of dailyHands) {
    await prisma.dailyHand.upsert({
      where: { date: hand.date },
      update: {},
      create: hand,
    });
    console.log(`  ✓ Mano del día: ${hand.title.slice(0, 40)}...`);
  }

  // ── Chat messages (direct) ─────────────────────────────────────────────────
  console.log("\nSeeding chat messages...");

  const chatMessages = [
    {
      senderId: createdUsers["ALUMNO"],
      receiverId: createdUsers["PROFESOR"],
      type: MessageType.DIRECT,
      content: "Hola profe! Tengo una duda sobre la convención Stayman. ¿Cuándo la usamos exactamente después de una apertura de 1NT?",
      isRead: true,
      readAt: new Date(Date.now() - 3600 * 1000),
      createdAt: new Date(Date.now() - 7200 * 1000),
    },
    {
      senderId: createdUsers["PROFESOR"],
      receiverId: createdUsers["ALUMNO"],
      type: MessageType.DIRECT,
      content: "¡Buena pregunta! Stayman (2♣) se usa cuando respondiente tiene al menos un mayor de 4 cartas y la mano justifica buscar el fit de 8 cartas en ese palo. La condición básica: tener entre 8-9 PH para invitar, o 10+ para forzar a game.",
      isRead: true,
      readAt: new Date(Date.now() - 3000 * 1000),
      createdAt: new Date(Date.now() - 3600 * 1000),
    },
    {
      senderId: createdUsers["ALUMNO"],
      receiverId: createdUsers["PROFESOR"],
      type: MessageType.DIRECT,
      content: "Perfecto, entonces si tengo ♠KJ84 ♥AQ73 ♦532 ♣96 (8 PH y dos mayores de 4), respondo 2♣ para preguntar, ¿verdad?",
      isRead: true,
      readAt: new Date(Date.now() - 1800 * 1000),
      createdAt: new Date(Date.now() - 2400 * 1000),
    },
    {
      senderId: createdUsers["PROFESOR"],
      receiverId: createdUsers["ALUMNO"],
      type: MessageType.DIRECT,
      content: "¡Exacto! Con esa mano, 2♣ es la respuesta perfecta. Si abridor rebid 2♥ o 2♠ mostrando el mayor pedido, puedes llevar al game directamente (4♥ o 4♠). Si rebid 2♦ (sin mayor), invitas con 2NT. ¿Queda claro?",
      isRead: false,
      createdAt: new Date(Date.now() - 1200 * 1000),
    },
    {
      senderId: createdUsers["ALUMNO"],
      receiverId: createdUsers["PROFESOR"],
      type: MessageType.DIRECT,
      content: "¡Clarísimo! Muchas gracias 🙏 Ya me quedo con la regla: Stayman con 8+ PH y al menos un mayor de 4. ¡Hasta la próxima clase!",
      isRead: false,
      createdAt: new Date(Date.now() - 600 * 1000),
    },
    // moderador → superadmin
    {
      senderId: createdUsers["MODERADOR"],
      receiverId: createdUsers["SUPERADMIN"],
      type: MessageType.DIRECT,
      content: "Hola! Vi que hay 3 reportes nuevos de contenido en el feed. Los revisé y dos son spam obvio, uno necesita tu criterio. ¿Tenés un minuto?",
      isRead: true,
      readAt: new Date(Date.now() - 900 * 1000),
      createdAt: new Date(Date.now() - 1800 * 1000),
    },
    {
      senderId: createdUsers["SUPERADMIN"],
      receiverId: createdUsers["MODERADOR"],
      type: MessageType.DIRECT,
      content: "Claro, mirá el panel de /admin/contenido. Los dos de spam ya los resolví recién. El tercero es un post con análisis de mano que alguien reportó por error — lo dejé activo.",
      isRead: false,
      createdAt: new Date(Date.now() - 300 * 1000),
    },
  ];

  for (const msg of chatMessages) {
    await prisma.chatMessage.create({ data: msg });
  }
  console.log(`  ✓ ${chatMessages.length} mensajes de chat creados`);

  // ── Teacher profile + Courses ─────────────────────────────────────────────
  console.log("\nSeeding teacher profile y cursos...");

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: createdUsers["PROFESOR"] },
    update: {},
    create: {
      userId: createdUsers["PROFESOR"],
      bio: "Jugador profesional de bridge con más de 15 años de experiencia. Campeón nacional de parejas 2019 y 2022. Apasionado por la enseñanza del juego.",
      experience: "Representante nacional en múltiples olympiadas. Instructor certificado por la WBF. Especialista en sistemas de subasta modernos y defensa.",
      federations: ["ABF — Asociación de Bridge de Argentina", "WBF — World Bridge Federation"],
      tournaments: ["Olympiad 2022 — Equipo Argentina", "Campeonato Sudamericano 2021"],
      titles: ["Campeón Nacional de Parejas 2022", "Gran Maestro Nacional"],
    },
  });

  console.log(`  ✓ Teacher profile creado para profesor@bridge.com`);

  // Curso 1 — Gratuito, nivel básico
  const course1 = await prisma.course.upsert({
    where: { id: "seed-course-1" },
    update: {},
    create: {
      id: "seed-course-1",
      teacherProfileId: teacherProfile.id,
      title: "Bridge desde Cero: Fundamentos del Juego",
      description:
        "El curso definitivo para aprender bridge desde cero. Aprenderás las reglas básicas, la subasta natural, cómo jugar una mano en notrump y los conceptos fundamentales de la defensa. Al completar este curso, tendrás todo lo necesario para participar en tu primera partida de bridge.",
      priceModel: PriceModel.FREE,
      price: 0,
      status: CourseStatus.PUBLISHED,
      level: "BEGINNER",
      tags: ["principiante", "fundamentos", "subasta", "notrump"],
      language: "es",
      totalDuration: 240,
      totalLessons: 8,
      hasCertificate: true,
      publishedAt: new Date(),
      thumbnail: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800&q=80",
    },
  });

  // Módulos y lecciones del Curso 1
  const mod1 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course1.id, order: 1 } },
    update: {},
    create: { courseId: course1.id, title: "Las Reglas del Juego", order: 1 },
  });

  const mod2 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course1.id, order: 2 } },
    update: {},
    create: { courseId: course1.id, title: "La Subasta Natural", order: 2 },
  });

  const mod3 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course1.id, order: 3 } },
    update: {},
    create: { courseId: course1.id, title: "El Juego de la Carta", order: 3 },
  });

  const lessons1 = [
    { moduleId: mod1.id, title: "¿Qué es el bridge?", order: 1, isPreview: true, duration: 15, content: "Introducción al bridge: historia, modalidades y por qué es el juego de cartas más estratégico del mundo." },
    { moduleId: mod1.id, title: "Las cartas y el mazo", order: 2, isPreview: true, duration: 20, content: "Estructura del mazo, palos y el concepto de levada." },
    { moduleId: mod2.id, title: "Apertura de 1 en mayor", order: 1, isPreview: false, duration: 30, content: "Cuándo y cómo abrir 1♠ o 1♥: requisitos de puntos y cartas." },
    { moduleId: mod2.id, title: "Apertura de 1NT", order: 2, isPreview: false, duration: 30, content: "La apertura de 1NT: rango de puntos, distribución y respuestas básicas." },
    { moduleId: mod2.id, title: "Respuestas básicas", order: 3, isPreview: false, duration: 35, content: "Cómo responder a la apertura del compañero: pases, levantamientos y cambios de color." },
    { moduleId: mod3.id, title: "El declarante en notrump", order: 1, isPreview: false, duration: 40, content: "Planificación del juego en notrump: contar levadas y establecer los palos." },
    { moduleId: mod3.id, title: "El juego en color", order: 2, isPreview: false, duration: 35, content: "Cómo aprovechar los triunfos y manejar los palos cortos." },
    { moduleId: mod3.id, title: "Introducción a la defensa", order: 3, isPreview: false, duration: 35, content: "Principios básicos de la defensa: señas, ataque inicial y comunicación con el compañero." },
  ];

  for (const l of lessons1) {
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: l.moduleId, order: l.order } },
      update: {},
      create: { ...l, status: LessonStatus.PUBLISHED },
    });
  }

  console.log(`  ✓ Curso 1: "${course1.title}" (${lessons1.length} lecciones)`);

  // Curso 2 — Pago, nivel intermedio
  const course2 = await prisma.course.upsert({
    where: { id: "seed-course-2" },
    update: {},
    create: {
      id: "seed-course-2",
      teacherProfileId: teacherProfile.id,
      title: "Convenciones Modernas: Stayman, Transfers y Jacoby",
      description:
        "Domina las tres convenciones más usadas en el bridge moderno. Este curso intermedio te enseñará a usar Stayman, Jacoby Transfer y 2NT de Jacoby con precisión quirúrgica. Con ejercicios prácticos y análisis de manos reales de torneos, llevarás tu subasta al siguiente nivel.",
      priceModel: PriceModel.ONE_TIME,
      price: 29.99,
      status: CourseStatus.PUBLISHED,
      level: "INTERMEDIATE",
      tags: ["convenciones", "stayman", "transfers", "jacoby", "intermedio"],
      language: "es",
      totalDuration: 360,
      totalLessons: 10,
      hasCertificate: true,
      freemiumCount: 2,
      publishedAt: new Date(),
      thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
    },
  });

  const mod4 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course2.id, order: 1 } },
    update: {},
    create: { courseId: course2.id, title: "Stayman: La Convención del Fit Mayor", order: 1 },
  });

  const mod5 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course2.id, order: 2 } },
    update: {},
    create: { courseId: course2.id, title: "Jacoby Transfers", order: 2 },
  });

  const mod6 = await prisma.module.upsert({
    where: { courseId_order: { courseId: course2.id, order: 3 } },
    update: {},
    create: { courseId: course2.id, title: "Jacoby 2NT y Casos Especiales", order: 3 },
  });

  const lessons2 = [
    { moduleId: mod4.id, title: "¿Qué es Stayman y para qué sirve?", order: 1, isPreview: true, duration: 25, content: "Origen de la convención y su objetivo: buscar el fit de 8 cartas en mayor." },
    { moduleId: mod4.id, title: "Cuándo usar Stayman: los requisitos", order: 2, isPreview: true, duration: 30, content: "Puntos mínimos, distribución necesaria y casos en los que NO se usa Stayman." },
    { moduleId: mod4.id, title: "Continuaciones después de 2♣", order: 3, isPreview: false, duration: 35, content: "Cómo continuar si abridor muestra mayor o rebid 2♦ (sin mayor)." },
    { moduleId: mod4.id, title: "Stayman con manos fuertes (slam)", order: 4, isPreview: false, duration: 30, content: "Uso de Stayman cuando se exploran slams. Rebids forzantes." },
    { moduleId: mod5.id, title: "Jacoby Transfers: el concepto", order: 1, isPreview: false, duration: 35, content: "Por qué transferir la declaración al abridor y las ventajas tácticas." },
    { moduleId: mod5.id, title: "Transfer a piques y corazones", order: 2, isPreview: false, duration: 35, content: "Mecánica completa de 2♦→2♥ y 2♥→2♠ con todos los rebids del respondiente." },
    { moduleId: mod5.id, title: "Super-accept y rechazo del transfer", order: 3, isPreview: false, duration: 30, content: "Cuándo abridor puede aceptar o rechazar el transfer y cómo afecta la subasta." },
    { moduleId: mod6.id, title: "Jacoby 2NT: la respuesta forzante", order: 1, isPreview: false, duration: 40, content: "Respuesta de 2NT forzante a game sobre apertura de mayor. Rebids del abridor." },
    { moduleId: mod6.id, title: "Singletones y void con Jacoby 2NT", order: 2, isPreview: false, duration: 35, content: "Cómo mostrar distribución corta para explorar el slam." },
    { moduleId: mod6.id, title: "Ejercicios y manos de torneo", order: 3, isPreview: false, duration: 45, content: "10 manos reales de torneos internacionales donde estas convenciones fueron decisivas." },
  ];

  for (const l of lessons2) {
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: l.moduleId, order: l.order } },
      update: {},
      create: { ...l, status: LessonStatus.PUBLISHED },
    });
  }

  console.log(`  ✓ Curso 2: "${course2.title}" (${lessons2.length} lecciones)`);

  // Inscribir al alumno en el curso gratuito
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: createdUsers["ALUMNO"], courseId: course1.id } },
    update: {},
    create: {
      userId: createdUsers["ALUMNO"],
      courseId: course1.id,
      pricePaid: 0,
      isActive: true,
    },
  });
  console.log(`  ✓ Alumno inscrito en el curso gratuito`);

  console.log("\n✅ Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
