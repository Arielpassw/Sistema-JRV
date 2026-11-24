
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

function validarCedulaEcuatoriana(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;

  const provincia = Number(cedula.substring(0, 2));
  const tercerDigito = Number(cedula[2]);

  if (provincia < 1 || provincia > 24 || tercerDigito > 5) {
    return false;
  }

  const digitos = cedula.split('').map(Number);
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = digitos[i] * (i % 2 === 0 ? 2 : 1);

    if (valor > 9) valor -= 9;
    suma += valor;
  }

  const verificador = (10 - (suma % 10)) % 10;

  return verificador === digitos[9];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return respuesta({ error: 'Método no permitido.' }, 405);
  }

  try {
    const { cedula, password } = await req.json();

    if (
      typeof cedula !== 'string' ||
      typeof password !== 'string' ||
      !validarCedulaEcuatoriana(cedula)
    ) {
      return respuesta(
        { error: 'Cédula o contraseña incorrectas.' },
        401,
      );
    }

    if (!password) {
      return respuesta(
        { error: 'Cédula o contraseña incorrectas.' },
        401,
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

    // Cliente administrativo: solo se utiliza dentro del servidor.
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

    // Buscar el correo asociado a la cédula.
    const { data: perfil, error: perfilError } = await adminClient
      .from('perfiles')
      .select('id, correo, activo')
      .eq('cedula', cedula)
      .eq('activo', true)
      .maybeSingle();

    if (perfilError || !perfil?.correo) {
      return respuesta(
        { error: 'Cédula o contraseña incorrectas.' },
        401,
      );
    }

    // Validar las credenciales mediante Supabase Auth.
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: perfil.correo,
        password,
      });

    if (authError || !authData.session) {
      return respuesta(
        { error: 'Cédula o contraseña incorrectas.' },
        401,
      );
    }

    if (authData.user.id !== perfil.id) {
      await authClient.auth.signOut();

      return respuesta(
        { error: 'No se pudo validar la cuenta.' },
        401,
      );
    }

    return respuesta({
      session: authData.session,
    });
  } catch (error) {
    console.error('Error en login-cedula:', error);

    return respuesta(
      { error: 'Ocurrió un error al iniciar sesión.' },
      500,
    );
  }
});
