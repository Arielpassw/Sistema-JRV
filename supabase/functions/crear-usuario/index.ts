
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
)!;

const PASSWORD_INICIAL = "Ecuador2026";

type CrearUsuarioRequest = {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  correo: string;
  rol: "coordinador_recinto" | "veedor_mesa";
  recintoId?: string;
  jrvId?: string;
};

function respuesta(
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;

  const provincia = Number(cedula.substring(0, 2));
  const tercerDigito = Number(cedula[2]);

  if (provincia < 1 || provincia > 24 || tercerDigito > 5) {
    return false;
  }

  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = Number(cedula[i]);

    if (i % 2 === 0) {
      valor *= 2;
      if (valor > 9) valor -= 9;
    }

    suma += valor;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;

  return digitoVerificador === Number(cedula[9]);
}

function esUUID(valor: string | undefined): boolean {
  return Boolean(
    valor &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        valor,
      ),
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respuesta({ error: "Método no permitido." }, 405);
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return respuesta({ error: "Sesión no proporcionada." }, 401);
  }

  let usuarioAuthId: string | null = null;

  const admin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  try {
    // 1. Identificar al coordinador que realiza la solicitud.
    const clienteUsuario = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const {
      data: { user },
      error: errorAuth,
    } = await clienteUsuario.auth.getUser();

    if (errorAuth || !user) {
      return respuesta({ error: "Sesión inválida o expirada." }, 401);
    }

    usuarioAuthId = user.id;

    // 2. Obtener y verificar el perfil del coordinador.
    const { data: coordinador, error: errorPerfil } = await admin
      .from("perfiles")
      .select("id, rol, provincia_id, activo")
      .eq("id", user.id)
      .maybeSingle();

    if (
      errorPerfil ||
      !coordinador ||
      !coordinador.activo
    ) {
      return respuesta(
        { error: "No se encontró un perfil activo para esta cuenta." },
        403,
      );
    }

    if (
      coordinador.rol !== "coordinador_provincial" &&
      coordinador.rol !== "coordinador_recinto"
    ) {
      return respuesta(
        { error: "Tu rol no tiene permisos para crear usuarios." },
        403,
      );
    }

    // 3. Leer y validar los datos del nuevo usuario.
    const body = (await req.json()) as CrearUsuarioRequest;

    const cedula = String(body.cedula ?? "").trim();
    const nombres = String(body.nombres ?? "").trim();
    const apellidos = String(body.apellidos ?? "").trim();
    const correo = String(body.correo ?? "").trim().toLowerCase();
    const telefono = body.telefono
      ? String(body.telefono).trim()
      : null;

    if (
      !cedula ||
      !nombres ||
      !apellidos ||
      !correo ||
      !body.rol
    ) {
      return respuesta(
        { error: "Completa todos los campos obligatorios." },
        400,
      );
    }

    if (!validarCedula(cedula)) {
      return respuesta({ error: "La cédula no es válida." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return respuesta({ error: "El correo electrónico no es válido." }, 400);
    }

    if (nombres.length > 100 || apellidos.length > 100) {
      return respuesta(
        { error: "Los nombres o apellidos exceden la longitud permitida." },
        400,
      );
    }

    // 4. Determinar el tipo de usuario y comprobar el alcance.
    let tipoAsignacion: "recinto" | "jrv";
    let recintoId: string | null = null;
    let jrvId: string | null = null;

    if (coordinador.rol === "coordinador_provincial") {
      if (body.rol !== "coordinador_recinto") {
        return respuesta(
          {
            error:
              "Un coordinador provincial solamente puede crear coordinadores de recinto.",
          },
          403,
        );
      }

      if (!esUUID(body.recintoId)) {
        return respuesta({ error: "Debes seleccionar un recinto válido." }, 400);
      }

      // Obtener la provincia a la que pertenece el recinto.
      const { data: recinto, error: errorRecinto } = await admin
        .from("recintos")
        .select("id, parroquia_id, activo")
        .eq("id", body.recintoId!)
        .maybeSingle();

      if (errorRecinto || !recinto || !recinto.activo) {
        return respuesta(
          { error: "El recinto no existe o está inactivo." },
          404,
        );
      }

      const { data: parroquia, error: errorParroquia } = await admin
        .from("parroquias")
        .select("id, canton_id")
        .eq("id", recinto.parroquia_id)
        .maybeSingle();

      if (errorParroquia || !parroquia) {
        return respuesta(
          { error: "No se pudo determinar la parroquia del recinto." },
          400,
        );
      }

      const { data: canton, error: errorCanton } = await admin
        .from("cantones")
        .select("id, provincia_id")
        .eq("id", parroquia.canton_id)
        .maybeSingle();

      if (
        errorCanton ||
        !canton ||
        canton.provincia_id !== coordinador.provincia_id
      ) {
        return respuesta(
          { error: "No puedes asignar usuarios a recintos de otra provincia." },
          403,
        );
      }

      tipoAsignacion = "recinto";
      recintoId = recinto.id;
    } else {
      if (body.rol !== "veedor_mesa") {
        return respuesta(
          {
            error:
              "Un coordinador de recinto solamente puede crear veedores de mesa.",
          },
          403,
        );
      }

      if (!esUUID(body.jrvId)) {
        return respuesta({ error: "Debes seleccionar una JRV válida." }, 400);
      }

      // Obtener el recinto al que pertenece la JRV.
      const { data: jrv, error: errorJrv } = await admin
        .from("jrv")
        .select("id, recinto_id")
        .eq("id", body.jrvId!)
        .maybeSingle();

      if (errorJrv || !jrv) {
        return respuesta({ error: "La JRV no existe." }, 404);
      }

      // Comprobar que el coordinador tenga asignado ese recinto.
      const { data: asignacionRecinto, error: errorAsignacion } =
        await admin
          .from("asignaciones")
          .select("id")
          .eq("perfil_id", coordinador.id)
          .eq("tipo_asignacion", "recinto")
          .eq("recinto_id", jrv.recinto_id)
          .eq("activa", true)
          .is("fecha_fin", null)
          .maybeSingle();

      if (errorAsignacion || !asignacionRecinto) {
        return respuesta(
          {
            error:
              "No puedes asignar veedores a una JRV fuera de tu recinto.",
          },
          403,
        );
      }

      tipoAsignacion = "jrv";
      jrvId = jrv.id;
    }

    // 5. Evitar duplicados de cédula en perfiles.
    const { data: perfilExistente, error: errorDuplicado } = await admin
      .from("perfiles")
      .select("id")
      .eq("cedula", cedula)
      .maybeSingle();

    if (errorDuplicado) {
      throw errorDuplicado;
    }

    if (perfilExistente) {
      return respuesta(
        { error: "Ya existe un usuario registrado con esa cédula." },
        409,
      );
    }

    // 6. Crear la cuenta en Supabase Auth.
    const { data: nuevoUsuario, error: errorCrearAuth } =
      await admin.auth.admin.createUser({
        email: correo,
        password: PASSWORD_INICIAL,
        email_confirm: true,
        user_metadata: {
          cedula,
          nombres,
          apellidos,
        },
      });

    if (errorCrearAuth || !nuevoUsuario.user) {
      return respuesta(
        {
          error:
            errorCrearAuth?.message ??
            "No se pudo crear la cuenta de autenticación.",
        },
        400,
      );
    }

    const nuevoUsuarioId = nuevoUsuario.user.id;

    // 7. Crear el perfil con exactamente el mismo UUID de Auth.
    const { error: errorCrearPerfil } = await admin
      .from("perfiles")
      .insert({
        id: nuevoUsuarioId,
        cedula,
        nombres,
        apellidos,
        telefono,
        correo,
        rol: body.rol,
        provincia_id: null,
        debe_cambiar_password: true,
        activo: true,
      });

    if (errorCrearPerfil) {
      await admin.auth.admin.deleteUser(nuevoUsuarioId);
      return respuesta(
        { error: "No se pudo crear el perfil: " + errorCrearPerfil.message },
        400,
      );
    }

    // 8. Registrar la asignación. El trigger validar_asignacion()
    // comprobará nuevamente las reglas de PostgreSQL.
    const { error: errorCrearAsignacion } = await admin
      .from("asignaciones")
      .insert({
        perfil_id: nuevoUsuarioId,
        tipo_asignacion: tipoAsignacion,
        recinto_id: recintoId,
        jrv_id: jrvId,
        asignado_por: coordinador.id,
        activa: true,
      });

    if (errorCrearAsignacion) {
      // Revertir los registros si la asignación no se pudo crear.
      await admin
        .from("perfiles")
        .delete()
        .eq("id", nuevoUsuarioId);

      await admin.auth.admin.deleteUser(nuevoUsuarioId);

      return respuesta(
        {
          error:
            "No se pudo registrar la asignación: " +
            errorCrearAsignacion.message,
        },
        400,
      );
    }

    // 9. Responder sin devolver contraseñas ni claves administrativas.
    return respuesta(
      {
        mensaje: "Usuario creado y asignado correctamente.",
        usuario: {
          id: nuevoUsuarioId,
          cedula,
          nombres,
          apellidos,
          correo,
          rol: body.rol,
        },
        asignacion: {
          tipo: tipoAsignacion,
          recintoId,
          jrvId,
        },
        debeCambiarPassword: true,
      },
      201,
    );
  } catch (error) {
    console.error("Error en crear-usuario:", error);

    return respuesta(
      { error: "Ocurrió un error interno al crear el usuario." },
      500,
    );
  }
});
