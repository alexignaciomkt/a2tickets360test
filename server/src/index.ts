import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db';
import {
    organizers as organizersTable,
    events,
    tickets,
    sales,
    checkins,
    staff,
    candidates,
    staffProposals,
    legalPages,
    stands,
    standCategories,
    sponsorTypes,
    sponsors,
    sponsorInstallments,
    sponsorDeliverables,
    visitors,
    admins,
    eventCategories,
    organizerPosts
} from './db/schema';
import { eq, and, or, ne, isNull, sql, gte, lte } from 'drizzle-orm';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { jwt, sign } from 'hono/jwt';

dotenv.config();

import { asaas } from './services/asaas';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { serveStatic } from '@hono/node-server/serve-static';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'a2tickets360@gmail.com',
        pass: 'stux gjzd umcp ezrb'
    }
});

const app = new Hono();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// SEED: Garantir que o Organizador de Teste existe
async function seedOrganizer() {
    const testId = '6d123456-789a-4bc3-d2e1-09876543210f';
    const exists = await db.query.organizers.findFirst({
        where: eq(organizersTable.id, testId)
    });

    if (!exists) {
        await db.insert(organizersTable).values({
            id: testId,
            name: 'A2 Produções Elite',
            email: 'contato@a2tickets360.com.br',
            passwordHash: await Bun.password.hash('123456'),
            emailVerified: true
        });
        console.log('✅ Organizador de teste criado');
    }
}

// SEED: Garantir que o Master Admin existe
async function seedMasterAdmin() {
    const email = 'alexignaciomkt@gmail.com';
    const exists = await db.query.admins.findFirst({
        where: eq(admins.email, email)
    });

    if (!exists) {
        await db.insert(admins).values({
            name: 'Alex Ignacio',
            email: email,
            passwordHash: await Bun.password.hash('Ticketera010203#360'),
            role: 'master'
        });
        console.log('✅ Master Admin criado');
    }
}

// SEED: Garantir que as Categorias Globais de Eventos existem
async function seedEventCategories() {
    const defaultCategories = [
        { name: 'Música', icon: 'Music' },
        { name: 'Feira de Negócios', icon: 'Briefcase' },
        { name: 'Festival', icon: 'PartyPopper' },
        { name: 'Workshop', icon: 'Wrench' },
        { name: 'Conferência', icon: 'Presentation' },
        { name: 'Teatro', icon: 'Drama' },
        { name: 'Dança', icon: 'Music2' },
        { name: 'Esportes', icon: 'Trophy' },
        { name: 'Gastronomia', icon: 'Utensils' },
        { name: 'Arte', icon: 'PenTool' },
        { name: 'Networking', icon: 'Users' },
        { name: 'Shows', icon: 'Ticket' },
        { name: 'Educação', icon: 'BookOpen' },
        { name: 'Tecnologia', icon: 'Monitor' },
        { name: 'Outros', icon: 'MoreHorizontal' },
    ];

    for (const cat of defaultCategories) {
        const exists = await db.query.eventCategories.findFirst({
            where: eq(eventCategories.name, cat.name)
        });
        if (!exists) {
            await db.insert(eventCategories).values(cat);
        }
    }
    console.log('✅ Categorias de eventos verificadas');
}

seedOrganizer();
seedMasterAdmin();
seedEventCategories();


// Middleware CORS Global
app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// Middleware de Autenticação (JWT)
const authMiddleware = jwt({
    secret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only',
    alg: 'HS256',
});

// Aplicar Auth APENAS em rotas protegidas
// Exemplo: app.use('/api/protected/*', authMiddleware);
// POR ENQUANTO: Vamos aplicar manualmente onde necessário ou criar grupos
// NÃO aplicar globalmente para evitar bloquear login/registro

app.get('/', (c: Context) => c.text('Ticketera API - High Performance Ready'));

// Health Check for Version Verification
app.get('/api/health', (c: Context) => {
    return c.json({
        status: 'ok',
        version: '1.0.2',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// --- DOWNLOAD/STORAGE ---
const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
}

// Servir arquivos estáticos
app.use('/uploads/*', serveStatic({ root: './' }));

// Endpoint de Upload
app.post('/api/upload', async (c: Context) => {
    try {
        console.log('[UPLOAD] Iniciando recebimento de arquivo...');
        const body = await c.req.parseBody();
        const file = body['file'] as any;

        if (!file || !(file instanceof File)) {
            console.error('[UPLOAD] Falha: Campo "file" ausente ou inválido');
            return c.json({ error: 'Nenhum arquivo válido enviado' }, 400);
        }

        console.log(`[UPLOAD] Recebido: ${file.name} (${file.size} bytes) - Tipo: ${file.type}`);

        const extension = file.name.split('.').pop() || 'jpg';
        const fileName = `${uuidv4()}.${extension}`;
        const filePath = join(UPLOADS_DIR, fileName);

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // Garantir que a URL da API não termina com /
        const apiUrl = (process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
        const url = `${apiUrl}/uploads/${fileName}`;

        console.log(`[UPLOAD] Sucesso! Arquivo salvo em: ${filePath} -> Disponível em: ${url}`);
        return c.json({ url });
    } catch (error: any) {
        console.error('[UPLOAD] Erro crítico no processo:', error);
        return c.json({ error: error.message }, 500);
    }
});

// --- AUTENTICAÇÃO REAL ---

app.post('/api/login', async (c: Context) => {
    const { email, password } = await c.req.json();
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

    try {
        // 1. Tentar Login como Admin Master
        const adminUser = await db.query.admins.findFirst({
            where: eq(admins.email, email)
        });

        if (adminUser) {
            const isMatch = await Bun.password.verify(password, adminUser.passwordHash);
            console.log(`[AUTH] Admin find: ${email}, Match: ${isMatch}`);
            if (isMatch) {
                const token = await sign({
                    id: adminUser.id,
                    email: adminUser.email,
                    role: adminUser.role,
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h
                }, secret);
                return c.json({ user: { ...adminUser, role: adminUser.role }, token });
            }
        }

        // 2. Tentar Login como Organizador
        const organizer = await db.query.organizers.findFirst({
            where: eq(organizersTable.email, email)
        });

        if (organizer) {
            const isMatch = await Bun.password.verify(password, organizer.passwordHash);
            console.log(`[AUTH] Organizer find: ${email}, Match: ${isMatch}`);
            if (isMatch) {
                const token = await sign({
                    id: organizer.id,
                    email: organizer.email,
                    role: 'organizer',
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
                }, secret);
                return c.json({ user: { ...organizer, role: 'organizer' }, token });
            }
        }

        // 3. Tentar Login como Staff
        const staffUser = await db.query.staff.findFirst({
            where: eq(staff.email, email)
        });

        if (staffUser) {
            const isMatch = await Bun.password.verify(password, staffUser.passwordHash);
            console.log(`[AUTH] Staff find: ${email}, Match: ${isMatch}`);
            if (isMatch) {
                const token = await sign({
                    id: staffUser.id,
                    email: staffUser.email,
                    role: 'staff',
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
                }, secret);
                return c.json({ user: { ...staffUser, role: 'staff' }, token });
            }
        }

        return c.json({ error: 'E-mail ou senha incorretos' }, 401);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// --- Rota de Cadastro de Organizador (Com Asaas e Verificação) ---
app.post('/api/organizers/register', async (c: Context) => {
    const { name, email, password, cpfCnpj, mobilePhone, slug, bannerUrl } = await c.req.json();
    const token = uuidv4();

    try {
        // 0. Verificar se já existe um organizador com este e-mail
        const existing = await db.query.organizers.findFirst({
            where: eq(organizersTable.email, email)
        });
        if (existing) {
            return c.json({ error: 'Já existe um organizador cadastrado com este e-mail.' }, 409);
        }

        // 0.1 Verificar se o slug já existe
        if (slug) {
            const slugExisting = await db.query.organizers.findFirst({
                where: eq(organizersTable.slug, slug)
            });
            if (slugExisting) {
                return c.json({ error: 'Este link (slug) já está sendo usado por outro produtor.' }, 409);
            }
        }

        // 1. Criar Subconta no Asaas (Opcional/Resiliente)
        let asaasAccount = null;
        if (cpfCnpj && mobilePhone) {
            try {
                asaasAccount = await asaas.createSubAccount({ name, email, cpfCnpj, mobilePhone });
            } catch (asError) {
                console.warn('⚠️ Falha ao criar subconta Asaas (Local/Sandbox?):', asError);
            }
        }

        // 2. Hash da senha
        const passwordHash = await Bun.password.hash(password);

        // 3. Salvar no Banco
        const [newOrganizer] = await db.insert(organizersTable).values({
            name,
            email,
            passwordHash,
            phone: mobilePhone || null,
            cpf: cpfCnpj || null,
            slug: slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''),
            bannerUrl: bannerUrl || null,
            asaasId: asaasAccount?.id,
            walletId: asaasAccount?.walletId,
            asaasApiKey: asaasAccount?.apiKey,
            emailVerified: false,
            verificationToken: token,
            isActive: true,
            profileComplete: false
        }).returning();

        // 4. Enviar e-mail de confirmação (Resiliente)
        try {
            const verificationUrl = `http://46.224.101.23:5173/auth/verify?token=${token}&type=organizer`;
            await transporter.sendMail({
                from: '"A2 Tickets 360" <a2tickets360@gmail.com>',
                to: email,
                subject: 'Verifique sua conta de Organizador - A2 Tickets 360',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #050505; color: white; padding: 40px; border-radius: 20px;">
                        <h1 style="color: #6366f1;">Bem-vindo, Produção Elite!</h1>
                        <p>Sua jornada na A2 Tickets 360 está prestes a começar. Confirme seu e-mail para ativar seu painel de organizador:</p>
                        <a href="${verificationUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px;">ATIVAR CONTA</a>
                        <p style="margin-top: 30px; font-size: 12px; color: #666;">Se você não realizou este cadastro, ignore este e-mail.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.warn('⚠️ Falha ao enviar e-mail (Local/SMTP?):', mailError);
        }

        return c.json({
            status: 'success',
            message: 'Cadastro realizado com sucesso!',
            organizerId: newOrganizer.id,
            warning: 'Asaas ou E-mail podem não ter sido processados em ambiente local.'
        });
    } catch (error: any) {
        console.error('❌ Erro no cadastro de organizador:', error);
        return c.json({ error: error.message || 'Erro interno ao criar organizador.' }, 400);
    }
});

// --- Rota de Checkout (Criação de Pagamento com Split) ---
app.post('/api/payments/checkout', async (c: Context) => {
    const { ticketId, quantity, buyerName, buyerEmail, buyerCpf, paymentMethod } = await c.req.json();

    try {
        const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
        if (!ticket) throw new Error('Ingresso não encontrado');

        const totalValue = Number(ticket.price) * quantity;

        // 1. Criar Cliente no Asaas
        const customer = await asaas.createCustomer({ name: buyerName, email: buyerEmail, cpfCnpj: buyerCpf });

        // 2. Criar Pagamento com Split (10%)
        const payment = await asaas.createPayment({
            customer: customer.id,
            billingType: paymentMethod,
            value: totalValue,
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
            description: `Compra de ${quantity}x ${ticket.name}`,
            externalReference: `sale_${Date.now()}`,
            splitPercent: 10 // Sua comissão de 10%
        });

        // 3. Registrar Venda Pendente
        const qrCode = `QR_${Math.random().toString(36).substring(7).toUpperCase()}`;
        await db.insert(sales).values({
            eventId: ticket.eventId,
            ticketId: ticket.id,
            buyerName,
            buyerEmail,
            quantity,
            totalPrice: totalValue.toString(),
            asaasPaymentId: payment.id,
            paymentStatus: 'pending',
            qrCodeData: qrCode
        });

        return c.json({ status: 'success', invoiceUrl: payment.invoiceUrl, paymentId: payment.id });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- Webhook do Asaas ---
app.post('/api/webhooks/asaas', async (c: Context) => {
    const data = await c.req.json();
    const { event, payment } = data;

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        const asaasId = payment.id;

        // Atualizar status no banco
        await db.update(sales)
            .set({ paymentStatus: 'paid' })
            .where(eq(sales.asaasPaymentId, asaasId));

        // Inserir no Redis para validação imediata no portão
        const saleRecord = await db.query.sales.findFirst({
            where: eq(sales.asaasPaymentId, asaasId)
        });

        if (saleRecord) {
            await redis.set(`ticket:${saleRecord.qrCodeData}`, 'PAID');
        }
    }

    return c.json({ received: true });
});

// --- Rota de Login (Staff e Organizador) ---
app.post('/api/auth/login', async (c: Context) => {
    const { email, password, role } = await c.req.json();

    try {
        if (role === 'organizer') {
            const organizer = await db.query.organizers.findFirst({
                where: eq(organizersTable.email, email),
            });

            if (!organizer || !organizer.emailVerified) {
                return c.json({ error: 'Credenciais inválidas ou e-mail não verificado' }, 401);
            }

            const isPasswordCorrect = await Bun.password.verify(password, organizer.passwordHash);
            if (!isPasswordCorrect) return c.json({ error: 'Credenciais inválidas' }, 401);

            const token = 'simulated_organizer_jwt'; // TODO: Sign real JWT
            return c.json({ token, user: { id: organizer.id, name: organizer.name, role: 'organizer' } });
        }

        const staffMember = await db.query.staff.findFirst({
            where: eq(staff.email, email),
        });

        if (!staffMember || staffMember.isActive === false) {
            return c.json({ error: 'Credenciais inválidas' }, 401);
        }

        // Simular verificação (Staff ainda usa mock no seed)
        if (password !== staffMember.passwordHash && staffMember.passwordHash !== '123456') {
            const isPasswordCorrect = await Bun.password.verify(password, staffMember.passwordHash);
            if (!isPasswordCorrect) return c.json({ error: 'Credenciais inválidas' }, 401);
        }

        return c.json({
            token: 'simulated_staff_token',
            user: { id: staffMember.id, name: staffMember.name, role: staffMember.roleId }
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- Categorias de Eventos (Banco Global) ---

app.get('/api/event-categories', async (c: Context) => {
    try {
        const categories = await db.query.eventCategories.findMany({
            orderBy: (cats: any, { asc }: any) => [asc(cats.name)]
        });
        return c.json(categories);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.post('/api/event-categories', async (c: Context) => {
    const { name, icon } = await c.req.json();
    try {
        // Verifica se já existe (case-insensitive)
        const existing = await db.query.eventCategories.findFirst({
            where: eq(eventCategories.name, name)
        });
        if (existing) return c.json(existing);

        const [newCategory] = await db.insert(eventCategories).values({
            name,
            icon: icon || 'Tag'
        }).returning();
        return c.json(newCategory);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- Gestão de Eventos (CRUD Real) ---

// Organizer Routes
// Singular alias for compatibility
app.get('/api/organizer/:id/profile', async (c) => {
    const id = c.req.param('id');
    try {
        const organizer = await db.query.organizers.findFirst({
            where: eq(organizersTable.id, id),
        });

        if (!organizer) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        const { passwordHash, ...profile } = organizer;
        return c.json(profile);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return c.json({ error: 'Erro interno do servidor' }, 500);
    }
});

app.get('/api/organizers/:id/profile', async (c) => {
    const id = c.req.param('id');
    try {
        const organizer = await db.query.organizers.findFirst({
            where: eq(organizersTable.id, id),
        });

        if (!organizer) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        const { passwordHash, ...profile } = organizer;
        return c.json(profile);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        return c.json({ error: 'Erro interno do servidor' }, 500);
    }
});


// Put routes with singular aliases
app.put('/api/organizer/:id/profile', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    try {
        const updated = await db.update(organizersTable)
            .set({
                ...body,
                updatedAt: new Date(),
            })
            .where(eq(organizersTable.id, id))
            .returning();

        if (updated.length === 0) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        const { passwordHash, ...profile } = updated[0];
        return c.json(profile);
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return c.json({ error: 'Erro ao atualizar perfil' }, 500);
    }
});

app.put('/api/organizers/:id/profile', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    try {
        const updated = await db.update(organizersTable)
            .set({
                ...body,
                updatedAt: new Date(),
            })
            .where(eq(organizersTable.id, id))
            .returning();

        if (updated.length === 0) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        const { passwordHash, ...profile } = updated[0];
        return c.json(profile);
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        return c.json({ error: 'Erro ao atualizar perfil' }, 500);
    }
});

app.put('/api/organizers/:id/complete-profile', async (c) => {
    const id = c.req.param('id');
    try {
        const updated = await db.update(organizersTable)
            .set({
                profileComplete: true,
                updatedAt: new Date(),
            })
            .where(eq(organizersTable.id, id))
            .returning();

        if (updated.length === 0) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        const { passwordHash, ...profile } = updated[0];
        return c.json(profile);
    } catch (error) {
        console.error('Erro ao concluir perfil:', error);
        return c.json({ error: 'Erro ao concluir perfil' }, 500);
    }
});

app.get('/api/organizers/slug/:slug', async (c) => {
    const slug = c.req.param('slug');
    try {
        const organizer = await db.query.organizers.findFirst({
            where: eq(organizersTable.slug, slug),
        });

        if (!organizer) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        const { passwordHash, asaasApiKey, ...publicProfile } = organizer;
        return c.json(publicProfile);
    } catch (error) {
        console.error('Erro ao buscar perfil por slug:', error);
        return c.json({ error: 'Erro interno do servidor' }, 500);
    }
});


// 1. Criar Evento
app.post('/api/events', async (c: Context) => {
    const data = await c.req.json();
    try {
        // Check if organizer has a complete profile
        let finalStatus = data.status || 'draft';

        if (finalStatus === 'published' && data.organizerId) {
            const organizer = await db.query.organizers.findFirst({
                where: eq(organizersTable.id, data.organizerId)
            });
            // If profile is not complete, force status to 'pending' for admin review
            if (!organizer?.profileComplete) {
                finalStatus = 'pending';
                console.log(`[EVENTS] Produtor ${data.organizerId} com perfil incompleto. Evento forçado para 'pending'.`);
            }
        }

        const [newEvent] = await db.insert(events).values({
            organizerId: data.organizerId,
            title: data.title,
            description: data.description,
            category: data.category,
            eventType: data.eventType || 'paid',
            date: data.date,
            time: data.time,
            duration: data.duration,
            locationName: data.locationName || data.location?.name,
            locationAddress: data.locationAddress || data.location?.address,
            locationCity: data.locationCity,
            locationState: data.locationState,
            locationPostalCode: data.locationPostalCode,
            capacity: Number(data.capacity) || 0,
            status: finalStatus,
            imageUrl: data.imageUrl,
            isFeatured: data.isFeatured || false,
            featuredPaymentStatus: data.featuredPaymentStatus || 'none',
        }).returning();
        return c.json({ ...newEvent, forcedToPending: finalStatus === 'pending' && data.status === 'published' });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.get('/api/public/featured-events', async (c: Context) => {
    try {
        const featured = await db.query.events.findMany({
            where: and(
                eq(events.isFeatured, true),
                eq(events.status, 'published')
            ),
            orderBy: (events, { desc }) => [desc(events.createdAt)]
        });
        return c.json(featured);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- Páginas Legais ---

app.get('/api/legal/:slug', async (c) => {
    const slug = c.req.param('slug');
    try {
        let page = await db.query.legalPages.findFirst({
            where: eq(legalPages.slug, slug),
        });

        // Seed inicial se não existir
        if (!page) {
            const title = slug === 'privacy' ? 'Política de Privacidade' : 'Termos de Uso';
            const [newPage] = await db.insert(legalPages).values({
                slug,
                title,
                content: '# ' + title + '\n\nConteúdo em breve...',
            }).returning();
            page = newPage;
        }

        return c.json(page);
    } catch (error) {
        return c.json({ error: 'Erro ao buscar página legal' }, 500);
    }
});

app.put('/api/legal/:slug', async (c) => {
    const slug = c.req.param('slug');
    const { content, title } = await c.req.json();
    try {
        const updated = await db.update(legalPages)
            .set({
                content,
                title,
                updatedAt: new Date()
            })
            .where(eq(legalPages.slug, slug))
            .returning();

        if (updated.length === 0) {
            return c.json({ error: 'Página não encontrada' }, 404);
        }

        return c.json(updated[0]);
    } catch (error) {
        return c.json({ error: 'Erro ao atualizar página legal' }, 500);
    }
});
const getEventsByOrganizer = async (c: Context) => {
    const organizerId = c.req.param('organizerId');
    try {
        const results = await db.query.events.findMany({
            where: eq(events.organizerId, organizerId),
            with: {
                tickets: true
            }
        } as any);

        // Transform flat location fields into nested location object for the frontend
        const transformedResults = results.map((event: any) => ({
            ...event,
            bannerUrl: event.imageUrl, // Map imageUrl to bannerUrl
            location: {
                name: event.locationName,
                address: event.locationAddress,
                city: event.locationCity,
                state: event.locationState,
                postalCode: event.locationPostalCode,
                coordinates: { lat: 0, lng: 0 } // Default for now
            }
        }));

        return c.json(transformedResults);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
};

app.get('/api/events/organizer/:organizerId', getEventsByOrganizer);
app.get('/api/events/organizers/:organizerId', getEventsByOrganizer);


// 3. Detalhes de um Evento
app.get('/api/events/:id', async (c: Context) => {
    const id = c.req.param('id');
    const result = await db.query.events.findFirst({
        where: eq(events.id, id),
        with: {
            tickets: true,
            organizer: true
        }
    } as any);

    if (!result) return c.json({ error: 'Evento não encontrado' }, 404);

    // Transform location and image
    const transformed = {
        ...result,
        bannerUrl: (result as any).imageUrl, // Added bannerUrl for frontend compatibility
        location: {
            name: (result as any).locationName,
            address: (result as any).locationAddress,
            city: (result as any).locationCity,
            state: (result as any).locationState,
            postalCode: (result as any).locationPostalCode
        }
    };

    return c.json(transformed);
});

// 3.5 Listar todos os eventos públicos
app.get('/api/public/events', async (c: Context) => {
    try {
        const results = await db.query.events.findMany({
            where: or(eq(events.status, 'published'), eq(events.status, 'active')),
            with: {
                tickets: true,
                organizer: true
            },
            orderBy: (events: any, { desc }: any) => [desc(events.date)]
        } as any);

        const transformedResults = results.map((event: any) => ({
            ...event,
            bannerUrl: event.imageUrl,
            location: {
                name: event.locationName,
                address: event.locationAddress,
                city: event.locationCity,
                state: event.locationState,
                postalCode: event.locationPostalCode
            }
        }));

        return c.json(transformedResults);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

app.get('/api/public/featured-events', async (c: Context) => {
    try {
        const results = await db.query.events.findMany({
            where: and(
                or(eq(events.status, 'published'), eq(events.status, 'active')),
                eq(events.isFeatured, true)
            ),
            with: {
                tickets: true,
                organizer: true
            },
            orderBy: (events: any, { desc }: any) => [desc(events.date)]
        } as any);

        const transformedResults = results.map((event: any) => ({
            ...event,
            bannerUrl: event.imageUrl,
            location: {
                name: event.locationName,
                address: event.locationAddress,
                city: event.locationCity,
                state: event.locationState,
                postalCode: event.locationPostalCode
            }
        }));

        return c.json(transformedResults);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// 4. Criar Categoria de Ingresso
app.post('/api/events/:id/tickets', async (c: Context) => {
    const eventId = c.req.param('id');
    const data = await c.req.json();
    try {
        const [newTicket] = await db.insert(tickets).values({
            ...data,
            eventId,
            price: data.price.toString(),
            remaining: data.quantity
        }).returning();
        return c.json(newTicket);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- ROTAS DE STANDS ---

// 1. Criar categoria de stand
app.post('/api/events/:eventId/stand-categories', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const data = await c.req.json();
    try {
        const [newCategory] = await db.insert(standCategories).values({
            ...data,
            eventId,
            price: data.price.toString()
        }).returning();
        return c.json(newCategory);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 2. Listar categorias de stand
app.get('/api/events/:eventId/stand-categories', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const categoriesList = await db.query.standCategories.findMany({
        where: eq(standCategories.eventId, eventId)
    });
    return c.json(categoriesList);
});

// 3. Criar stand
app.post('/api/events/:eventId/stands', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const data = await c.req.json();
    try {
        const [newStand] = await db.insert(stands).values({
            ...data,
            eventId
        }).returning();
        return c.json(newStand);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 4. Listar stands do evento
app.get('/api/events/:eventId/stands', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const standsList = await db.query.stands.findMany({
        where: eq(stands.eventId, eventId),
        with: {
            category: true,
            soldBy: true
        }
    });
    return c.json(standsList);
});

// 5. Atualizar stand (venda/reserva)
app.put('/api/stands/:id', async (c: Context) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
        const [updatedStand] = await db.update(stands)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(stands.id, id))
            .returning();
        return c.json(updatedStand);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 6. Remover stand
app.delete('/api/stands/:id', async (c: Context) => {
    const id = c.req.param('id');
    try {
        await db.delete(stands).where(eq(stands.id, id));
        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 7. Salvar/Atualizar planta baixa do evento
app.post('/api/events/:eventId/floor-plan', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const { floorPlanUrl } = await c.req.json();
    try {
        const [updatedEvent] = await db.update(events)
            .set({ floorPlanUrl, updatedAt: new Date() })
            .where(eq(events.id, eventId))
            .returning();
        return c.json(updatedEvent);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- Candidatos / Marketplace ---

// 1. Cadastro Público de Candidato com Confirmação por e-mail
app.post('/api/candidates', async (c: Context) => {
    const data = await c.req.json();
    const token = uuidv4();

    try {
        const [newCandidate] = await db.insert(candidates).values({
            ...data,
            passwordHash: await Bun.password.hash(data.password),
            emailVerified: false,
            verificationToken: token
        }).returning();

        // Enviar e-mail de confirmação
        const verificationUrl = `http://46.224.101.23:5173/auth/verify?token=${token}&type=candidate`;

        await transporter.sendMail({
            from: '"A2 Tickets 360" <a2tickets360@gmail.com>',
            to: data.email,
            subject: 'Confirme seu e-mail - A2 Tickets 360',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #050505; color: white; padding: 40px; border-radius: 20px;">
                    <h1 style="color: #6366f1;">Bem-vindo ao Marketplace Staff!</h1>
                    <p>Para ativar seu perfil e começar a receber propostas, confirme seu e-mail clicando no botão abaixo:</p>
                    <a href="${verificationUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px;">CONFIRMAR E-MAIL</a>
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">Se você não realizou este cadastro, ignore este e-mail.</p>
                </div>
            `
        });

        return c.json({ status: 'success', message: 'E-mail de verificação enviado!' });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 2. Endpoint de Verificação de E-mail
app.get('/api/auth/verify', async (c: Context) => {
    const token = c.req.query('token');
    const type = c.req.query('type');

    try {
        if (type === 'candidate') {
            const user = await db.query.candidates.findFirst({
                where: eq(candidates.verificationToken, token as string)
            });

            if (!user) return c.json({ error: 'Token inválido' }, 400);

            await db.update(candidates)
                .set({ emailVerified: true, verificationToken: null })
                .where(eq(candidates.id, user.id));
        } else {
            const user = await db.query.organizers.findFirst({
                where: eq(organizersTable.verificationToken, token as string)
            });

            if (!user) return c.json({ error: 'Token inválido' }, 400);

            await db.update(organizersTable)
                .set({ emailVerified: true, verificationToken: null })
                .where(eq(organizersTable.id, user.id));
        }

        return c.json({ status: 'success', message: 'E-mail confirmado com sucesso!' });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 2. Recrutador busca talentos
app.get('/api/candidates/organizer/:organizerId', async (c: Context) => {
    const organizerId = c.req.param('organizerId');
    // Em um sistema real, poderíamos filtrar por proximidade ou categorias
    const talentPool = await db.query.candidates.findMany();
    return c.json(talentPool);
});

// 3. Recrutador envia proposta
app.post('/api/organizers/proposals', async (c: Context) => {
    const data = await c.req.json();
    try {
        const [proposal] = await db.insert(staffProposals).values({
            candidateId: data.candidateId,
            eventId: data.eventId,
            organizerId: data.organizerId,
            roleId: data.roleId,
            roleName: data.roleName,
            pay: data.pay,
            status: 'pending'
        }).returning();
        return c.json({ status: 'success', proposal });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 4. Worker visualiza seu portal (Propostas e Agenda)
app.get('/api/worker/portal/:candidateId', async (c: Context) => {
    const candidateId = c.req.param('candidateId');

    const workerProposals = await db.query.staffProposals.findMany({
        where: eq(staffProposals.candidateId, candidateId),
        with: {
            event: true
        }
    } as any);

    return c.json({ proposals: workerProposals });
});

// 5. Worker responde à proposta
app.post('/api/candidates/:id/proposals/:propId/respond', async (c: Context) => {
    const candidateId = c.req.param('id');
    const proposalId = c.req.param('propId');
    const { status } = await c.req.json();

    try {
        await db.update(staffProposals)
            .set({
                status,
                respondedAt: new Date()
            })
            .where(and(
                eq(staffProposals.id, proposalId),
                eq(staffProposals.candidateId, candidateId)
            ));

        // Se aceito, opcionalmente criar entrada na tabela 'staff' fixada no evento
        return c.json({ status: 'success' });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- MASTER ADMIN: Gestão de Organizadores ---

// 1. Listar todos os organizadores (Apenas ativos)
app.get('/api/master/organizers', async (c: Context) => {
    try {
        const organizersList = await db.query.organizers.findMany({
            where: or(eq(organizersTable.isActive, true), isNull(organizersTable.isActive)),
            orderBy: (organizers, { desc }) => [desc(organizers.createdAt)]
        });
        return c.json(organizersList);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 2. Criar Organizador via Master (Direto)
app.post('/api/master/organizers', async (c: Context) => {
    const { name, email, password } = await c.req.json();
    try {
        const passwordHash = await Bun.password.hash(password);
        const [newOrganizer] = await db.insert(organizersTable).values({
            name,
            email,
            passwordHash,
            emailVerified: true, // Master cria já verificado
            isActive: true
        }).returning();
        return c.json(newOrganizer);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 3. Editar Organizador
app.put('/api/master/organizers/:id', async (c: Context) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
        if (data.password) {
            data.passwordHash = await Bun.password.hash(data.password);
            delete data.password;
        }
        const [updated] = await db.update(organizersTable)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(organizersTable.id, id))
            .returning();
        return c.json(updated);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 4. Excluir Organizador (Soft Delete)
app.delete('/api/master/organizers/:id', async (c: Context) => {
    const id = c.req.param('id');
    try {
        const [updated] = await db.update(organizersTable)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(organizersTable.id, id))
            .returning();

        if (!updated) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        return c.json({ message: 'Organizador excluído com sucesso' });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 5. Listar eventos pendentes para aprovação (draft E pending)
app.get('/api/master/events/pending', async (c: Context) => {
    try {
        const pendingEvents = await db.query.events.findMany({
            where: or(eq(events.status, 'draft'), eq(events.status, 'pending')),
            with: {
                organizer: true
            },
            orderBy: (events, { desc }) => [desc(events.createdAt)]
        });
        return c.json(pendingEvents);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 6. Aprovar evento (aceita draft, pending → published)
app.put('/api/master/events/:id/approve', async (c: Context) => {
    const id = c.req.param('id');
    try {
        const event = await db.query.events.findFirst({ where: eq(events.id, id) });
        if (!event) return c.json({ error: 'Evento não encontrado' }, 404);

        if (!['draft', 'pending'].includes(event.status as string)) {
            return c.json({ error: `Evento com status '${event.status}' não pode ser aprovado.` }, 400);
        }

        const [updated] = await db.update(events)
            .set({
                status: 'published',
                updatedAt: new Date()
            })
            .where(eq(events.id, id))
            .returning();

        return c.json({ message: 'Evento aprovado com sucesso', event: updated });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 7. Aprovar Organizador Manualmente (Bypass Onboarding)
app.post('/api/master/organizers/:id/approve-manually', async (c: Context) => {
    const id = c.req.param('id');
    try {
        const [updated] = await db.update(organizersTable)
            .set({
                profileComplete: true,
                updatedAt: new Date()
            })
            .where(eq(organizersTable.id, id))
            .returning();

        if (!updated) {
            return c.json({ error: 'Organizador não encontrado' }, 404);
        }

        return c.json({ status: 'success', message: 'Cadastro aprovado manualmente!' });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});


// --- MÓDULO DE PATROCINADORES ---

// Listar Tipos de Patrocínio por Organizador
app.get('/api/organizers/:organizerId/sponsor-types', async (c: Context) => {
    const organizerId = c.req.param('organizerId');
    try {
        const types = await db.query.sponsorTypes.findMany({
            where: eq(sponsorTypes.organizerId, organizerId)
        });
        return c.json(types);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Criar Tipo de Patrocínio para Organizador
app.post('/api/organizers/:organizerId/sponsor-types', async (c: Context) => {
    const organizerId = c.req.param('organizerId');
    const data = await c.req.json();
    try {
        const [newType] = await db.insert(sponsorTypes).values({
            ...data,
            organizerId,
            defaultValue: data.defaultValue?.toString()
        }).returning();
        return c.json(newType);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Listar Patrocinadores de um Evento
app.get('/api/events/:eventId/sponsors', async (c: Context) => {
    const eventId = c.req.param('eventId');
    try {
        const eventSponsors = await db.query.sponsors.findMany({
            where: eq(sponsors.eventId, eventId),
            with: {
                type: true,
                soldBy: true,
                installments: true,
                deliverables: true
            }
        });
        return c.json(eventSponsors);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Criar Patrocinador
app.post('/api/events/:eventId/sponsors', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const data = await c.req.json();
    try {
        const [newSponsor] = await db.insert(sponsors).values({
            ...data,
            eventId,
            totalValue: data.totalValue.toString()
        }).returning();
        return c.json(newSponsor);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Atualizar Patrocinador
app.put('/api/sponsors/:id', async (c: Context) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
        const updateData = { ...data, updatedAt: new Date() };
        if (data.totalValue) updateData.totalValue = data.totalValue.toString();

        const [updated] = await db.update(sponsors)
            .set(updateData)
            .where(eq(sponsors.id, id))
            .returning();
        return c.json(updated);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Parcelas
app.post('/api/sponsors/:id/installments', async (c: Context) => {
    const sponsorId = c.req.param('id');
    const installmentsData = await c.req.json(); // Array de parcelas
    try {
        const newInstallments = await db.insert(sponsorInstallments).values(
            installmentsData.map((inst: any) => ({
                ...inst,
                sponsorId,
                value: inst.value.toString(),
                dueDate: new Date(inst.dueDate)
            }))
        ).returning();
        return c.json(newInstallments);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.put('/api/sponsor-installments/:id', async (c: Context) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
        const [updated] = await db.update(sponsorInstallments)
            .set({
                ...data,
                paidDate: data.status === 'paid' ? new Date() : null
            })
            .where(eq(sponsorInstallments.id, id))
            .returning();
        return c.json(updated);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Contrapartidas
app.post('/api/sponsors/:id/deliverables', async (c: Context) => {
    const sponsorId = c.req.param('id');
    const data = await c.req.json();
    try {
        const [newDeliverable] = await db.insert(sponsorDeliverables).values({
            ...data,
            sponsorId
        }).returning();
        return c.json(newDeliverable);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.put('/api/sponsor-deliverables/:id', async (c: Context) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
        const [updated] = await db.update(sponsorDeliverables)
            .set({
                ...data,
                completedAt: data.isCompleted ? new Date() : null
            })
            .where(eq(sponsorDeliverables.id, id))
            .returning();
        return c.json(updated);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- MÓDULO DE VISITANTES ---

// 1. Inscrição Pública de Visitante
app.post('/api/events/:eventId/visitors/register', async (c: Context) => {
    const eventId = c.req.param('eventId');
    const data = await c.req.json();
    const qrCodeData = `VIS-${uuidv4()}`;

    try {
        const [newVisitor] = await db.insert(visitors).values({
            ...data,
            eventId,
            qrCodeData,
            status: 'registered'
        }).returning();

        // TODO: Enviar email com o QR Code

        return c.json(newVisitor);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 2. Listar Visitantes do Evento
app.get('/api/events/:eventId/visitors', async (c: Context) => {
    const eventId = c.req.param('eventId');
    try {
        const visitorsList = await db.query.visitors.findMany({
            where: eq(visitors.eventId, eventId)
        });
        return c.json(visitorsList);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 3. Atualizar Visitante
app.put('/api/visitors/:id', async (c: Context) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    try {
        const [updated] = await db.update(visitors)
            .set(data)
            .where(eq(visitors.id, id))
            .returning();
        return c.json(updated);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 4. Validar QR Code de Visitante
app.get('/api/visitors/validate/:qrCode', async (c: Context) => {
    const qrCode = c.req.param('qrCode');
    try {
        const visitor = await db.query.visitors.findFirst({
            where: eq(visitors.qrCodeData, qrCode)
        });
        if (!visitor) {
            return c.json({ error: 'Visitante não encontrado' }, 404);
        }
        return c.json(visitor);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 5. Check-in do Visitante
app.post('/api/visitors/:id/checkin', async (c: Context) => {
    const id = c.req.param('id');
    try {
        const [visitor] = await db.update(visitors)
            .set({
                status: 'checked_in',
                checkedInAt: new Date()
            })
            .where(eq(visitors.id, id))
            .returning();
        return c.json(visitor);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// --- MÓDULO DE FEED DO ORGANIZADOR ---

// 1. Criar Post
app.post('/api/organizers/:id/posts', async (c: Context) => {
    const organizerId = c.req.param('id');
    const { imageUrl, caption } = await c.req.json();
    try {
        const [newPost] = await db.insert(organizerPosts).values({
            organizerId,
            imageUrl,
            caption
        }).returning();
        return c.json(newPost);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 2. Listar Posts do Organizador
app.get('/api/organizers/:id/posts', async (c: Context) => {
    const organizerId = c.req.param('id');
    try {
        const posts = await db.query.organizerPosts.findMany({
            where: eq(organizerPosts.organizerId, organizerId),
            orderBy: (posts, { desc }) => [desc(posts.createdAt)]
        });
        return c.json(posts);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// 3. Remover Post
app.delete('/api/organizers/:id/posts/:postId', async (c: Context) => {
    const organizerId = c.req.param('id');
    const postId = c.req.param('postId');
    try {
        const deleted = await db.delete(organizerPosts)
            .where(and(
                eq(organizerPosts.id, postId),
                eq(organizerPosts.organizerId, organizerId)
            ))
            .returning();

        if (deleted.length === 0) return c.json({ error: 'Post não encontrado' }, 404);
        return c.json({ success: true });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Helper: Validar Completude do Perfil
function isProfileActuallyComplete(org: any) {
    const requiredFields = [
        'name', 'email', 'phone', 'address', 'city', 'state', 'postalCode',
        'companyName', 'bio', 'logoUrl', 'bannerUrl'
    ];

    // Check basic fields
    for (const field of requiredFields) {
        if (!org[field]) return false;
    }

    // Check document (either CPF/RG or CNPJ)
    const hasCpf = !!(org.cpf && org.rg);
    const hasCnpj = !!org.cnpj;

    if (!hasCpf && !hasCnpj) return false;

    // Check documents uploaded
    if (!org.documentFrontUrl || !org.documentBackUrl) return false;

    return true;
}

// Rota para validar e atualizar status de completude
app.get('/api/master/events', async (c: Context) => {
    try {
        const allEvents = await db.query.events.findMany({
            with: {
                organizer: true,
                tickets: true
            },
            orderBy: (events, { desc }) => [desc(events.createdAt)]
        });
        return c.json(allEvents);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});


app.get('/api/master/stats', async (c: Context) => {
    try {
        const totalEvents = await db.select({ count: sql`count(*)` }).from(events);
        const totalOrganizers = await db.select({ count: sql`count(*)` }).from(organizersTable);
        const activeOrganizers = await db.select({ count: sql`count(*)` }).from(organizersTable).where(eq(organizersTable.isActive, true));
        const pendingOrganizers = await db.select({ count: sql`count(*)` }).from(organizersTable).where(eq(organizersTable.profileComplete, false));

        const totalVisitors = await db.select({ count: sql`count(*)` }).from(visitors);

        const pendingEvents = await db.select({ count: sql`count(*)` }).from(events).where(eq(events.status, 'draft'));

        // Total Revenue from paid sales
        const revenueResult = await db.select({ total: sql`sum(total_price)` }).from(sales).where(eq(sales.paymentStatus, 'paid'));
        const totalRevenue = Number(revenueResult[0]?.total || 0);
        const totalCommissions = totalRevenue * 0.10; // Assuming 10% flat commission for now

        // Events this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        const eventsThisMonth = await db.select({ count: sql`count(*)` })
            .from(events)
            .where(gte(events.date, firstDayOfMonth.toISOString().split('T')[0]));

        return c.json({
            totalEvents: Number(totalEvents[0].count),
            totalOrganizers: Number(totalOrganizers[0].count),
            activeOrganizers: Number(activeOrganizers[0].count),
            pendingOrganizers: Number(pendingOrganizers[0].count),
            totalUsers: Number(totalVisitors[0].count),
            pendingEvents: Number(pendingEvents[0].count),
            totalRevenue: totalRevenue,
            totalCommissions: totalCommissions,
            totalPayouts: 0,
            eventsThisMonth: Number(eventsThisMonth[0].count),
            alertsCount: Number(pendingEvents[0].count) + Number(pendingOrganizers[0].count),
            newOrganizersMonth: 0
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.get('/api/customer/tickets', async (c: Context) => {
    const email = c.req.query('email');
    if (!email) return c.json({ error: 'Email é obrigatório' }, 400);

    try {
        const tickets = await db.query.sales.findMany({
            where: eq(sales.buyerEmail, email),
            with: {
                event: true,
                ticket: true
            },
            orderBy: (sales, { desc }) => [desc(sales.createdAt)]
        });
        return c.json(tickets);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.get('/api/organizers/:id/stats', async (c: Context) => {
    const organizerId = c.req.param('id');
    try {
        // Count staff
        const staffCount = await db.select({ count: sql`count(*)` })
            .from(staff)
            .where(eq(staff.organizerId, organizerId));

        // Count visitors through events
        const visitorCount = await db.select({ count: sql`count(*)` })
            .from(visitors)
            .innerJoin(events, eq(visitors.eventId, events.id))
            .where(eq(events.organizerId, organizerId));

        // Get next event
        const nextEvent = await db.query.events.findFirst({
            where: and(
                eq(events.organizerId, organizerId),
                gte(events.date, new Date().toISOString().split('T')[0])
            ),
            orderBy: (events, { asc }) => [asc(events.date), asc(events.time)]
        });

        return c.json({
            staffCount: Number(staffCount[0].count),
            visitorCount: Number(visitorCount[0].count),
            nextEvent: nextEvent || null
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

app.put('/api/master/events/:id/featured', async (c: Context) => {
    const id = c.req.param('id');
    const { isFeatured } = await c.req.json();
    try {
        const [updated] = await db.update(events)
            .set({
                isFeatured,
                featuredUntil: isFeatured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
                updatedAt: new Date()
            })
            .where(eq(events.id, id))
            .returning();

        if (!updated) {
            return c.json({ error: 'Evento não encontrado' }, 404);
        }

        return c.json(updated);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

export default {
    port: 3000,
    fetch: app.fetch,
};
