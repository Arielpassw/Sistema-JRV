
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
    const authorization = req.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return respuesta({ error: 'Sesión no válida.' }, 401);
    }

    const { password } = await req.json();

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

    // Cliente asociado a la sesión del usuario.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return respuesta({ error: 'Sesión no válida.' }, 401);
    }

    // Cliente administrativo: nunca se entrega al frontend.
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

    const { data: perfil, error: perfilError } = await adminClient
      .from('perfiles')
      .select('id, debe_cambiar_password')
      .eq('id', user.id)
      .maybeSingle();

    if (perfilError || !perfil) {
      return respuesta({ error: 'Perfil no encontrado.' }, 404);
    }

    if (!perfil.debe_cambiar_password) {
      return respuesta(
        { error: 'La contraseña inicial ya fue cambiada.' },
        409,
      );
    }

    // Cambiar primero la contraseña en Supabase Auth.
    const { error: passwordError } =
      await userClient.auth.updateUser({ password });

    if (passwordError) {
      return respuesta(
        { error: 'No se pudo actualizar la contraseña.' },
        400,
      );
    }

    // Marcar el cambio obligatorio como completado.
    const { error: updateError } = await adminClient
      .from('perfiles')
      .update({
        debe_cambiar_password: false,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(
        'La contraseña cambió, pero no se actualizó el perfil:',
        updateError,
      );

      return respuesta(
        {
          error:
            'La contraseña se actualizó, pero no se pudo confirmar el cambio en el perfil. Contacta al administrador.',
        },
        500,
      );
    }

    return respuesta({
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (error) {
    console.error('Error en cambiar-password-inicial:', error);

    return respuesta(
      { error: 'Ocurrió un error al cambiar la contraseña.' },
      500,
    );
  }
});
