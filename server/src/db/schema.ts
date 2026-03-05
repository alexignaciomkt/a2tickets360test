import { pgTable, text, timestamp, serial, integer, boolean, decimal, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Administradores da Plataforma (Master)
export const admins = pgTable('admins', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['master', 'admin'] }).default('master'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Organizadores (Donos dos Eventos)
export const organizers = pgTable('organizers', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),

    // Dados Pessoais
    cpf: text('cpf'),
    rg: text('rg'),
    phone: text('phone'),
    birthDate: text('birth_date'),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postal_code'),
    documentFrontUrl: text('document_front_url'),
    documentBackUrl: text('document_back_url'),

    // Dados da Produtora
    companyName: text('company_name'),
    cnpj: text('cnpj'),
    companyAddress: text('company_address'),
    logoUrl: text('logo_url'),
    bannerUrl: text('banner_url'),
    bio: text('bio'),
    slug: text('slug').unique(),
    category: text('category'),
    instagramUrl: text('instagram_url'),
    facebookUrl: text('facebook_url'),
    whatsappNumber: text('whatsapp_number'),
    websiteUrl: text('website_url'),

    // Status do Cadastro
    profileComplete: boolean('profile_complete').default(false),
    lastStep: integer('last_step').default(1),

    asaasId: text('asaas_id'), // ID da subconta no Asaas
    asaasApiKey: text('asaas_api_key'),
    walletId: text('wallet_id'),
    emailVerified: boolean('email_verified').default(false),
    verificationToken: text('verification_token'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Categorias de Eventos (Banco Global Colaborativo)
export const eventCategories = pgTable('event_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').unique().notNull(),
    icon: text('icon'), // Nome do ícone Lucide (ex: 'Briefcase')
    createdAt: timestamp('created_at').defaultNow(),
});

// Eventos
export const events = pgTable('events', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    eventType: text('event_type', { enum: ['paid', 'free'] }).default('paid'),
    date: text('date').notNull(), // Formato ISO ou YYYY-MM-DD
    time: text('time').notNull(),
    endDate: text('end_date'),
    endTime: text('end_time'),
    duration: text('duration'),
    locationName: text('location_name'),
    locationAddress: text('location_address'),
    locationCity: text('location_city'),
    locationState: text('location_state'),
    locationPostalCode: text('location_postal_code'),
    capacity: integer('capacity').notNull(),
    status: text('status', { enum: ['draft', 'pending', 'published', 'active', 'completed', 'cancelled'] }).default('draft'),
    imageUrl: text('image_url'),
    floorPlanUrl: text('floor_plan_url'),
    isFeatured: boolean('is_featured').default(false),
    featuredUntil: timestamp('featured_until'),
    featuredPaymentStatus: text('featured_payment_status').default('none'), // none, pending, paid
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Ingressos
export const tickets = pgTable('tickets', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    remaining: integer('remaining').notNull(),
    batch: text('batch'), // Lote
    isActive: boolean('is_active').default(true),
    category: text('category', { enum: ['standard', 'vip', 'early-bird', 'student', 'group'] }).default('standard'),
});

// Vendas e Transações
export const sales = pgTable('sales', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    ticketId: uuid('ticket_id').references(() => tickets.id).notNull(),
    buyerName: text('buyer_name').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    buyerPhone: text('buyer_phone'),
    quantity: integer('quantity').notNull(),
    totalPrice: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
    paymentStatus: text('payment_status', { enum: ['pending', 'paid', 'refunded', 'cancelled'] }).default('pending'),
    paymentMethod: text('payment_method'), // PIX, CREDIT_CARD, BOLETO
    asaasPaymentId: text('asaas_payment_id'), // ID da cobrança no Asaas
    qrCodeData: text('qr_code_data').unique().notNull(), // O código que será validado
    createdAt: timestamp('created_at').defaultNow(),
});

// Staff / Membros da Equipe (Vinculados a Organizadores ou Eventos)
export const staff = pgTable('staff', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    eventId: uuid('event_id').references(() => events.id), // Pode ser staff geral ou fixo no evento
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    photoUrl: text('photo_url'),
    roleId: text('role_id').notNull(),
    eventFunction: text('event_function'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    lastLogin: timestamp('last_login'),
});

// Check-ins (Validação de Ingressos)
export const checkins = pgTable('checkins', {
    id: serial('id').primaryKey(),
    saleId: uuid('sale_id').references(() => sales.id).notNull(),
    staffId: uuid('staff_id').references(() => staff.id).notNull(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    checkInTime: timestamp('check_in_time').defaultNow(),
});

// Categorias Globais de Fornecedores (Colaborativas)
export const supplierCategories = pgTable('supplier_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').unique().notNull(), // Nome único (ex: 'Papel Toalha', 'Sonorização')
    icon: text('icon'), // Nome do ícone da Lucide (opcional)
    createdAt: timestamp('created_at').defaultNow(),
});

// Fornecedores
export const suppliers = pgTable('suppliers', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    categoryId: uuid('category_id').references(() => supplierCategories.id), // Referência à categoria global
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    category: text('category'), // Mantido para compatibilidade ou texto livre secundário
    document: text('document'), // CNPJ/CPF
    address: text('address'), // Endereço completo
    contactName: text('contact_name'), // Nome do responsável/contato
    contactPhone: text('contact_phone'), // Telefone do responsável
    status: text('status', { enum: ['active', 'inactive'] }).default('active'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Contratos de Fornecedores
export const supplierContracts = pgTable('supplier_contracts', {
    id: uuid('id').primaryKey().defaultRandom(),
    supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    eventId: uuid('event_id').references(() => events.id),
    title: text('title').notNull(),
    fileUrl: text('file_url'),
    value: decimal('value', { precision: 10, scale: 2 }),
    status: text('status', { enum: ['pending', 'signed', 'expired', 'cancelled'] }).default('pending'),
    signedAt: timestamp('signed_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Cotações (Orçamentos)
export const quotes = pgTable('quotes', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    eventId: uuid('event_id').references(() => events.id),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['open', 'approved', 'rejected', 'closed'] }).default('open'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Respostas de Cotações
export const quoteResponses = pgTable('quote_responses', {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id').references(() => quotes.id).notNull(),
    supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
    value: decimal('value', { precision: 10, scale: 2 }),
    fileUrl: text('file_url'), // PDF do orçamento
    notes: text('notes'),
    isAccepted: boolean('is_accepted').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

// Candidatos / Profissionais Independentes (Marketplace)
export const candidates = pgTable('candidates', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    phone: text('phone'),
    photoUrl: text('photo_url'),
    biography: text('biography'),
    city: text('city'),
    state: text('state'),
    experience: text('experience'),
    rating: decimal('rating', { precision: 3, scale: 2 }).default('5.00'),
    certifications: jsonb('certifications').default([]),
    emailVerified: boolean('email_verified').default(false),
    verificationToken: text('verification_token'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Propostas de Trabalho (Invitations)
export const staffProposals = pgTable('staff_proposals', {
    id: uuid('id').primaryKey().defaultRandom(),
    candidateId: uuid('candidate_id').references(() => candidates.id).notNull(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    roleId: text('role_id').notNull(),
    roleName: text('role_name').notNull(),
    pay: text('pay').notNull(),
    status: text('status', { enum: ['pending', 'accepted', 'declined'] }).default('pending'),
    sentAt: timestamp('sent_at').defaultNow(),
    respondedAt: timestamp('responded_at'),
});

// --- NOVAS TABELAS PARA FEIRAS E PATROCÍNIO ---

// Tipos de Patrocínio (Por Organizador)
export const sponsorTypes = pgTable('sponsor_types', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    name: text('name').notNull(), // Ex: 'Cota Ouro', 'Cota Prata'
    description: text('description'),
    defaultValue: decimal('default_value', { precision: 10, scale: 2 }), // Valor sugerido
    createdAt: timestamp('created_at').defaultNow(),
});

// Patrocinadores
export const sponsors = pgTable('sponsors', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    sponsorTypeId: uuid('sponsor_type_id').references(() => sponsorTypes.id).notNull(),
    soldByStaffId: uuid('sold_by_staff_id').references(() => staff.id), // Vendedor
    companyName: text('company_name').notNull(),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    document: text('document'), // CNPJ
    totalValue: decimal('total_value', { precision: 10, scale: 2 }).notNull(),
    installments: integer('installments').default(1),
    status: text('status', { enum: ['prospecting', 'negotiating', 'confirmed', 'delivered', 'cancelled'] }).default('prospecting'),
    contractUrl: text('contract_url'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Parcelas de Patrocínio
export const sponsorInstallments = pgTable('sponsor_installments', {
    id: uuid('id').primaryKey().defaultRandom(),
    sponsorId: uuid('sponsor_id').references(() => sponsors.id).notNull(),
    installmentNumber: integer('installment_number').notNull(),
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    dueDate: timestamp('due_date').notNull(),
    paidDate: timestamp('paid_date'),
    status: text('status', { enum: ['pending', 'paid', 'overdue'] }).default('pending'),
    paymentMethod: text('payment_method'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Contrapartidas de Patrocínio
export const sponsorDeliverables = pgTable('sponsor_deliverables', {
    id: uuid('id').primaryKey().defaultRandom(),
    sponsorId: uuid('sponsor_id').references(() => sponsors.id).notNull(),
    description: text('description').notNull(),
    isCompleted: boolean('is_completed').default(false),
    completedAt: timestamp('completed_at'),
    evidenceUrl: text('evidence_url'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Categorias de Stands
export const standCategories = pgTable('stand_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    name: text('name').notNull(), // Ex: 'Ilha', 'Esquina'
    size: text('size'), // Ex: '3x3m'
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// Stands
export const stands = pgTable('stands', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    categoryId: uuid('category_id').references(() => standCategories.id).notNull(),
    soldByStaffId: uuid('sold_by_staff_id').references(() => staff.id), // Vendedor
    identifier: text('identifier').notNull(), // Ex: 'A-01'
    exhibitorName: text('exhibitor_name'),
    exhibitorEmail: text('exhibitor_email'),
    exhibitorPhone: text('exhibitor_phone'),
    exhibitorDocument: text('exhibitor_document'),
    status: text('status', { enum: ['available', 'reserved', 'sold'] }).default('available'),
    reservedUntil: timestamp('reserved_until'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Visitantes (Credenciamento Público)
export const visitors = pgTable('visitors', {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id').references(() => events.id).notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    document: text('document'), // CPF
    company: text('company'),
    role: text('role'),
    qrCodeData: text('qr_code_data').unique().notNull(),
    status: text('status', { enum: ['registered', 'confirmed', 'checked_in'] }).default('registered'),
    registeredAt: timestamp('registered_at').defaultNow(),
    checkedInAt: timestamp('checked_in_at'),
});

// Páginas Legais (Privacidade, Termos, etc)
export const legalPages = pgTable('legal_pages', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').unique().notNull(), // 'privacy', 'terms'
    title: text('title').notNull(),
    content: text('content').notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Posts dos Organizadores (Feed/Instagram-like)
export const organizerPosts = pgTable('organizer_posts', {
    id: uuid('id').primaryKey().defaultRandom(),
    organizerId: uuid('organizer_id').references(() => organizers.id).notNull(),
    imageUrl: text('image_url').notNull(),
    caption: text('caption'),
    createdAt: timestamp('created_at').defaultNow(),
});

// --- Relações (Drizzle Relations API) ---

export const organizersRelations = relations(organizers, ({ many }) => ({
    events: many(events),
    suppliers: many(suppliers),
    staff: many(staff),
    posts: many(organizerPosts),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
    organizer: one(organizers, {
        fields: [events.organizerId],
        references: [organizers.id],
    }),
    tickets: many(tickets),
    sales: many(sales),
    proposals: many(staffProposals),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
    event: one(events, {
        fields: [sales.eventId],
        references: [events.id],
    }),
    ticket: one(tickets, {
        fields: [sales.ticketId],
        references: [tickets.id],
    }),
    checkins: many(checkins),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
    organizer: one(organizers, {
        fields: [staff.organizerId],
        references: [organizers.id],
    }),
    event: one(events, {
        fields: [staff.eventId],
        references: [events.id],
    }),
    checkins: many(checkins),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
    sale: one(sales, {
        fields: [checkins.saleId],
        references: [sales.id],
    }),
    staff: one(staff, {
        fields: [checkins.staffId],
        references: [staff.id],
    }),
    event: one(events, {
        fields: [checkins.eventId],
        references: [events.id],
    }),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
    proposals: many(staffProposals),
}));

export const staffProposalsRelations = relations(staffProposals, ({ one }) => ({
    candidate: one(candidates, {
        fields: [staffProposals.candidateId],
        references: [candidates.id],
    }),
    event: one(events, {
        fields: [staffProposals.eventId],
        references: [events.id],
    }),
    organizer: one(organizers, {
        fields: [staffProposals.organizerId],
        references: [organizers.id],
    }),
}));

export const sponsorTypesRelations = relations(sponsorTypes, ({ one, many }) => ({
    organizer: one(organizers, {
        fields: [sponsorTypes.organizerId],
        references: [organizers.id],
    }),
    sponsors: many(sponsors),
}));

export const sponsorsRelations = relations(sponsors, ({ one, many }) => ({
    event: one(events, {
        fields: [sponsors.eventId],
        references: [events.id],
    }),
    organizer: one(organizers, {
        fields: [sponsors.organizerId],
        references: [organizers.id],
    }),
    type: one(sponsorTypes, {
        fields: [sponsors.sponsorTypeId],
        references: [sponsorTypes.id],
    }),
    soldBy: one(staff, {
        fields: [sponsors.soldByStaffId],
        references: [staff.id],
    }),
    installments: many(sponsorInstallments),
    deliverables: many(sponsorDeliverables),
}));

export const sponsorInstallmentsRelations = relations(sponsorInstallments, ({ one }) => ({
    sponsor: one(sponsors, {
        fields: [sponsorInstallments.sponsorId],
        references: [sponsors.id],
    }),
}));

export const sponsorDeliverablesRelations = relations(sponsorDeliverables, ({ one }) => ({
    sponsor: one(sponsors, {
        fields: [sponsorDeliverables.sponsorId],
        references: [sponsors.id],
    }),
}));

export const standsRelations = relations(stands, ({ one }) => ({
    event: one(events, {
        fields: [stands.eventId],
        references: [events.id],
    }),
    organizer: one(organizers, {
        fields: [stands.organizerId],
        references: [organizers.id],
    }),
    category: one(standCategories, {
        fields: [stands.categoryId],
        references: [standCategories.id],
    }),
    soldBy: one(staff, {
        fields: [stands.soldByStaffId],
        references: [staff.id],
    }),
}));

export const standCategoriesRelations = relations(standCategories, ({ one, many }) => ({
    event: one(events, {
        fields: [standCategories.eventId],
        references: [events.id],
    }),
    stands: many(stands),
}));

export const visitorsRelations = relations(visitors, ({ one }) => ({
    event: one(events, {
        fields: [visitors.eventId],
        references: [events.id],
    }),
}));

export const organizerPostsRelations = relations(organizerPosts, ({ one }) => ({
    organizer: one(organizers, {
        fields: [organizerPosts.organizerId],
        references: [organizers.id],
    }),
}));
