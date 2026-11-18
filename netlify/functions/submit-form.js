// Netlify Function: recibe el formulario y envía dos correos vía Brevo.
// La clave API se lee de la variable de entorno BREVO_API_KEY (nunca en el frontend).

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const ADMIN_EMAIL = 'administracionollacomun@gmail.com';
const SENDER = { name: 'CampusSwap · Equipo', email: 'administracionollacomun@gmail.com' };

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    let data;
    try {
        data = JSON.parse(event.body || '{}');
    } catch (err) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const email = (data.email || '').trim();
    const carrera = (data.carrera || '').trim();

    if (!email || !carrera) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos obligatorios' }) };
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        console.error('BREVO_API_KEY no configurada');
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuración del servidor incompleta' }) };
    }

    const items = Array.isArray(data.items) ? data.items.join(', ') : 'Ninguno';
    const rol = data.rol || 'N/A';

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Correo 1: confirmación y agradecimiento al estudiante
    const confirmationEmail = {
        sender: SENDER,
        to: [{ email, name: 'Estudiante' }],
        subject: '¡Gracias por tu interés en CampusSwap! 🎉',
        htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b;">
                <h1 style="font-size: 24px;">¡Gracias por sumarte! 🙌</h1>
                <p>Recibimos tu registro para el piloto de <strong>CampusSwap</strong>, el mercado de segunda mano dentro del campus UDD.</p>
                <p>Te escribiremos al correo apenas habilitemos la carga de productos esta semana.</p>
                <p>Mientras tanto, recuerda: <strong>sin pagos en la app, trato directo en el campus y 0% comisión.</strong></p>
                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
                <p style="font-size: 12px; color: #52525b;">CampusSwap · Piloto Fin de Semestre · UDD</p>
            </div>
        `
    };

    // Correo 2: aviso a administración con los datos del formulario
    const adminEmail = {
        sender: SENDER,
        to: [{ email: ADMIN_EMAIL, name: 'Administración' }],
        replyTo: { email, name: 'Estudiante' },
        subject: `Nuevo registro CampusSwap · ${carrera}`,
        htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b;">
                <h1 style="font-size: 20px;">Nuevo registro de acceso anticipado</h1>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 8px 0; font-weight: bold;">Correo:</td><td>${escapeHtml(email)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Carrera:</td><td>${escapeHtml(carrera)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Rol:</td><td>${escapeHtml(rol)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Implementos:</td><td>${escapeHtml(items)}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Canal anterior:</td><td>${escapeHtml(data.canal_actual || 'N/A')}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Acceso anticipado:</td><td>${data.early_access ? 'Sí' : 'No'}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: bold;">Fecha:</td><td>${escapeHtml(data.timestamp || new Date().toISOString())}</td></tr>
                </table>
            </div>
        `
    };

    try {
        const send = (payload) => fetch(BREVO_URL, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const [studentResponse, adminResponse] = await Promise.all([
            send(confirmationEmail),
            send(adminEmail)
        ]);

        if (!studentResponse.ok || !adminResponse.ok) {
            const errors = [];
            if (!studentResponse.ok) errors.push(`confirmación: ${await studentResponse.text()}`);
            if (!adminResponse.ok) errors.push(`administración: ${await adminResponse.text()}`);
            console.error('Error al enviar correos:', errors.join(' | '));
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'No se pudieron enviar los correos' }) };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ ok: true, message: 'Registro recibido y correos enviados' })
        };
    } catch (err) {
        console.error('Error inesperado:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
    }
};
