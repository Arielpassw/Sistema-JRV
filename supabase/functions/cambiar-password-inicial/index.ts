
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respuesta(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return respuesta({ error: 'Método no permitido.' }, 405);
  }

  try {
    // 1. Obtener y validar el token de sesión.
    const authorization = req.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return respuesta({ error: 'Sesión no válida.' }, 401);
    }

    const accessToken = authorization.substring(7);

    // 2. Recibir y validar la nueva contraseña.
    const body = await req.json();
    const password = body?.password;

    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password === 'Ecuador2026'
    ) {
      return respuesta(
        {
          error:
            'La nueva contraseña debe tener al menos 8 caracteres y ser diferente de la contraseña inicial.',
        },
        400,
      );
    }

    // 3. Obtener las variables de entorno.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('Faltan variables de entorno de Supabase.');

      return respuesta(
        { error: 'Error de configuración del servidor.' },
        500,
      );
    }

    // 4. Verificar la identidad usando el token recibido.
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      console.error('Error verificando sesión:', userError?.message);

      return respuesta({ error: 'Sesión no válida.' }, 401);
    }

    // 5. Crear cliente administrativo exclusivamente en el servidor.
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 6. Verificar el perfil y el cambio obligatorio.
    const { data: perfil, error: perfilError } = await adminClient
      .from('perfiles')
      .select('id, debe_cambiar_password')
      .eq('id', user.id)
      .maybeSingle();

    if (perfilError) {
      console.error('Error consultando perfil:', perfilError.message);

      return respuesta(
        { error: 'No se pudo consultar el perfil del usuario.' },
        500,
      );
    }

    if (!perfil) {
      return respuesta({ error: 'Perfil no encontrado.' }, 404);
    }

    if (!perfil.debe_cambiar_password) {
      return respuesta(
        { error: 'La contraseña inicial ya fue cambiada.' },
        409,
      );
    }

    // 7. Actualizar la contraseña del usuario autenticado.
    const { error: passwordError } =
      await adminClient.auth.admin.updateUserById(user.id, {
        password,
      });

    if (passwordError) {
      console.error(
        'Error actualizando contraseña en Auth:',
        passwordError.message,
      );

      return respuesta(
        {
          error: passwordError.message ||
            'No se pudo actualizar la contraseña.',
        },
        400,
      );
    }

    // 8. Desactivar la obligación de cambiar la contraseña.
    const { error: updateError } = await adminClient
      .from('perfiles')
      .update({
        debe_cambiar_password: false,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(
        'La contraseña cambió, pero falló la actualización del perfil:',
        updateError.message,
      );

      return respuesta(
        {
          error:
            'La contraseña se actualizó, pero no se pudo actualizar el perfil. Contacta al administrador.',
        },
        500,
      );
    }

    // 9. Confirmar operación.
    return respuesta({
      message: 'Contraseña actualizada correctamente.',
      debeCambiarPassword: false,
    });
  } catch (error) {
    console.error('Error en cambiar-password-inicial:', error);

    return respuesta(
      { error: 'Ocurrió un error al cambiar la contraseña.' },
      500,
    );
  }
});
