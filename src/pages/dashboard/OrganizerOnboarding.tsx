import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Building2, Palette, Landmark, CheckCircle2,
    ArrowLeft, ArrowRight, Camera, Upload, ShieldCheck,
    MapPin, Sparkles, Building, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizerService';
import EventWizardStepper from '@/components/events/EventWizardStepper';

const STEPS = [
    { number: 1, title: 'Identidade Visual', icon: <Palette className="h-4 w-4" /> },
    { number: 2, title: 'Dados Pessoais', icon: <User className="h-4 w-4" /> },
    { number: 3, title: 'Financeiro', icon: <Landmark className="h-4 w-4" /> },
    { number: 4, title: 'Seu Feed', icon: <Camera className="h-4 w-4" /> },
];

const OrganizerOnboarding = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedPosts, setFeedPosts] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        // Visual (Step 1)
        companyName: '',
        bio: '',
        logoUrl: '',
        bannerUrl: '',
        slug: '',
        category: '',
        instagramUrl: '',
        facebookUrl: '',
        whatsappNumber: '',
        websiteUrl: '',

        // Pessoal (Step 2)
        cpf: '',
        rg: '',
        phone: '',
        birthDate: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        documentFrontUrl: '',
        documentBackUrl: '',
        cnpj: '',
        companyAddress: '',

        // Financeiro (Step 3)
        asaasApiKey: '',
        lastStep: 1,
    });

    const [previews, setPreviews] = useState({
        docFront: null as string | null,
        docBack: null as string | null,
        logo: null as string | null,
        banner: null as string | null,
    });

    const [lastSavedData, setLastSavedData] = useState<string>('');

    // Auto-save logic with debounce
    useEffect(() => {
        const currentDataStr = JSON.stringify(formData);

        // Persistência local imediata para segurança do usuário
        if (user?.id) {
            localStorage.setItem(`onboarding_draft_${user.id}`, currentDataStr);
        }

        if (lastSavedData && currentDataStr !== lastSavedData && !loading && !saving) {
            const timer = setTimeout(() => {
                saveProfile();
            }, 2000); // 2 seconds debounce
            return () => clearTimeout(timer);
        }
    }, [formData, loading, user?.id]);

    useEffect(() => {
        if (user?.id) {
            // Tenta recuperar rascunho do localStorage antes de buscar do banco
            const localDraft = localStorage.getItem(`onboarding_draft_${user.id}`);
            if (localDraft) {
                try {
                    const parsed = JSON.parse(localDraft);
                    setFormData(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error('Erro ao ler rascunho local:', e);
                }
            }
            loadProfile();
        }
    }, [user?.id]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const profile = await organizerService.getProfile(user!.id);
            if (profile) {
                // Remove internal fields that shouldn't be in formData for saving
                const { id, email, createdAt, updatedAt, passwordHash, ...safeProfile } = profile;

                setFormData(prev => ({
                    ...prev,
                    ...safeProfile
                }));

                // Track initial state to avoid immediate auto-save
                setLastSavedData(JSON.stringify({ ...formData, ...safeProfile }));

                if (profile.lastStep && profile.lastStep > 1 && profile.lastStep <= 4) {
                    setCurrentStep(profile.lastStep);
                }
                setPreviews({
                    docFront: profile.documentFrontUrl || null,
                    docBack: profile.documentBackUrl || null,
                    logo: profile.logoUrl || null,
                    banner: profile.bannerUrl || null,
                });

                // Load Feed Posts
                const posts = await organizerService.getPosts(user!.id);
                setFeedPosts(posts);
            }
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, previewKey: keyof typeof previews) => {
        const file = e.target.files?.[0];
        if (file) {
            // Preview imediato local
            const localUrl = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [previewKey]: localUrl }));

            try {
                // Upload real para o servidor
                const { url } = await organizerService.uploadImage(file);

                // Atualiza o dado no formulário para persistência no banco
                setFormData(prev => ({ ...prev, [field]: url }));

                // NOTA: Mantemos o preview local (localUrl) para evitar "piscar" ou quebra se a API_URL estiver incorreta (VPS)
                // Apenas se não houver erro de upload, confirmamos a URL real no estado, mas o Blob URL continua sendo válido no browser
                console.log(`[UPLOAD] URL persistida no banco: ${url}`);
            } catch (err) {
                console.error('Erro no upload:', err);
                toast({
                    variant: 'destructive',
                    title: 'Erro no Upload',
                    description: 'Não foi possível salvar a imagem no servidor.'
                });
            }
        }
    };

    const handlePhotoFeedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setSaving(true);
        try {
            const newPosts = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const { url } = await organizerService.uploadImage(file);
                const post = await organizerService.createPost(user!.id, { imageUrl: url });
                newPosts.push(post);
            }
            setFeedPosts(prev => [...newPosts, ...prev]);
            toast({ title: 'Sucesso', description: `${files.length} foto(s) adicionada(s) ao seu feed.` });
        } catch (err) {
            console.error('Erro no upload do feed:', err);
            toast({ variant: 'destructive', title: 'Erro no Upload', description: 'Não foi possível salvar as fotos.' });
        } finally {
            setSaving(false);
        }
    };

    const removeFeedPhoto = async (postId: string) => {
        try {
            await organizerService.deletePost(user!.id, postId);
            setFeedPosts(prev => prev.filter(p => p.id !== postId));
        } catch (err) {
            console.error('Erro ao remover post:', err);
        }
    };

    const handleCepBlur = async () => {
        const cep = formData.postalCode.replace(/\D/g, '');
        if (cep.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setFormData(prev => ({
                    ...prev,
                    address: `${data.logradouro}, ${data.bairro}`,
                    city: data.localidade,
                    state: data.uf
                }));
            }
        } catch (err) {
            console.warn('Erro ao buscar CEP:', err);
        }
    };

    const saveProfile = async (step?: number) => {
        if (!user?.id) {
            console.error('SaveProfile: No user ID');
            return false;
        }

        if (loading) {
            console.warn('SaveProfile: Still loading profile');
            return false;
        }

        if (saving) return false;

        setSaving(true);
        try {
            // Explicitly whitelist fields to be sent to the backend
            // This prevents errors in Drizzle/Postgres when trying to update non-existent or restricted columns
            const allowedFields = [
                'name', 'cpf', 'rg', 'phone', 'birthDate', 'address', 'city', 'state', 'postalCode',
                'documentFrontUrl', 'documentBackUrl', 'companyName', 'cnpj', 'companyAddress',
                'logoUrl', 'bannerUrl', 'bio', 'asaasApiKey', 'slug', 'category',
                'instagramUrl', 'facebookUrl', 'whatsappNumber', 'websiteUrl'
            ];

            const finalData: any = {};

            // Populate finalData only with permitted fields that exist in formData
            allowedFields.forEach(field => {
                const value = (formData as any)[field];
                if (value !== undefined && value !== null) {
                    finalData[field] = value;
                }
            });

            finalData.lastStep = step || currentStep;

            console.log('Tentando salvar:', finalData);
            await organizerService.updateProfile(user.id, finalData);

            setLastSavedData(JSON.stringify(formData));
            return true;
        } catch (err: any) {
            console.error('Erro ao salvar perfil:', err);
            // If it's a manual navigation, show the error but return false to signal failure
            if (step) {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao salvar',
                    description: 'Seu progresso não foi salvo, mas vamos tentar prosseguir.'
                });
            }
            return false;
        } finally {
            setSaving(false);
        }
    };

    const nextStep = async () => {
        console.log('nextStep disparado. Passo atual:', currentStep);
        if (loading || saving) return;

        const next = currentStep + 1;
        if (next > 4) return;

        // Tenta salvar, mas permite avançar mesmo com erro no save
        const saved = await saveProfile(next);

        console.log('Resultado do saveProfile:', saved);

        // FORÇA O AVANÇO para não travar o usuário
        setCurrentStep(next);
        window.scrollTo(0, 0);

        if (!saved) {
            toast({
                variant: 'destructive',
                title: 'Atenção',
                description: 'Avançamos, mas houve um erro ao salvar esses dados. Verifique sua conexão.'
            });
        }
    };

    const prevStep = async () => {
        if (currentStep > 1) {
            const prev = currentStep - 1;
            // Save before going back to ensure data is captured
            await saveProfile(prev);
            setCurrentStep(prev);
            window.scrollTo(0, 0);
        }
    };

    const handleStepClick = async (step: number) => {
        // Save current progress before switching steps via clicking
        const saved = await saveProfile(step);
        if (saved) {
            setCurrentStep(step);
            window.scrollTo(0, 0);
        }
    };

    const skipOnboarding = () => {
        toast({ title: 'Acesso Liberado', description: 'Você pode concluir seu perfil a qualquer momento nas configurações.' });
        navigate('/organizer/dashboard');
    };

    const finishOnboarding = async () => {
        console.log('Finalizando onboarding para usuario:', user?.id);
        const saved = await saveProfile();
        if (saved) {
            try {
                // Backend validation of completion
                await organizerService.validateStatus(user!.id);

                await organizerService.completeProfile(user!.id);
                // Flag to show welcome modal on dashboard
                localStorage.setItem('A2Tickets_showWelcome', 'true');
                toast({ title: '🎊 Cadastro Concluído!', description: 'Agora você pode criar seus eventos.' });
                navigate('/organizer');
            } catch (err) {
                console.error('Erro ao completar perfil:', err);
                toast({ variant: 'destructive', title: 'Erro ao finalizar', description: 'Tente novamente.' });
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4 border border-indigo-100">
                        <Sparkles className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                        Seja bem-vindo, {user?.name.split(' ')[0]}!
                    </h1>
                    <p className="mt-2 text-gray-500 font-medium">
                        Precisamos completar seu cadastro de produtor para liberar o sistema.
                    </p>
                </div>

                <EventWizardStepper steps={STEPS} currentStep={currentStep} onStepClick={handleStepClick} />

                <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-sm min-h-[500px]">
                    {/* Step 1: Identidade Visual / Vitrine */}
                    {currentStep === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <Palette className="h-5 w-5 text-indigo-500" /> Vitrine do Produtor
                                    </h3>
                                    <p className="text-sm text-gray-500">Personalize como os usuários verão sua página pública</p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Criação de FanPage</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-2 block">Nome da Produtora / Marca *</label>
                                        <Input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Ex: Elite Eventos" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-2 block">URL Personalizada (Slug)</label>
                                        <div className="flex items-center">
                                            <span className="bg-gray-100 border border-r-0 border-gray-200 px-3 py-2 rounded-l-xl text-xs text-gray-500">.../p/</span>
                                            <Input name="slug" value={formData.slug} onChange={handleInputChange} placeholder="minha-produtora" className="rounded-l-none" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Sobre a Produtora (Bio)</label>
                                    <Textarea name="bio" value={formData.bio} onChange={handleInputChange} placeholder="Conte sua história e os tipos de eventos que você produz..." rows={3} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-4 block">Logo de Perfil</label>
                                        <div className="relative w-32 h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 group transition-all hover:border-indigo-400 overflow-hidden">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logoUrl', 'logo')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            {previews.logo ? (
                                                <img src={previews.logo} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="h-6 w-6 text-gray-300 mx-auto" />
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Subir Foto</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-4 block">Banner de Capa</label>
                                        <div className="relative h-32 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 group transition-all hover:border-indigo-400 overflow-hidden">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'bannerUrl', 'banner')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            {previews.banner ? (
                                                <img src={previews.banner} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Upload Capa</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Redes Sociais & Contato Público</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input name="instagramUrl" value={formData.instagramUrl} onChange={handleInputChange} placeholder="Instagram URL" />
                                        <Input name="whatsappNumber" value={formData.whatsappNumber} onChange={handleInputChange} placeholder="WhatsApp (DDD + Número)" />
                                    </div>
                                </div>

                                {/* Preview Mockup compact */}
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles className="h-3 w-3" /> Preview FanPage
                                        </h4>
                                        <span className="text-[10px] font-bold text-indigo-600">PROFISSIONAL</span>
                                    </div>
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scale-95 origin-top">
                                        <div className="h-24 bg-gray-200 relative">
                                            {previews.banner && <img src={previews.banner} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="px-6 pb-6 relative">
                                            <div className="absolute -top-10 left-6 w-20 h-20 rounded-2xl border-4 border-white bg-gray-100 overflow-hidden shadow-md">
                                                {previews.logo && <img src={previews.logo} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="pt-12">
                                                <h5 className="font-bold text-gray-900">{formData.companyName || 'Sua Produtora'}</h5>
                                                <p className="text-[10px] text-gray-400 truncate">{formData.bio || 'Sua descrição profissional aparecerá aqui...'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Dados Pessoais & Produtora Dados */}
                    {currentStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <User className="h-5 w-5 text-indigo-500" /> Registro Profissional
                                </h3>
                                <p className="text-sm text-gray-500">Informações para verificação e emissão de notas</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">CNPJ (Opcional)</label>
                                        <Input name="cnpj" value={formData.cnpj} onChange={handleInputChange} placeholder="00.000.000/0000-00" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Telefone de Contato *</label>
                                        <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="(11) 98765-4321" />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-4 pt-4 border-t">
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Documentos do Responsável</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors bg-gray-50 group">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'documentFrontUrl', 'docFront')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            {previews.docFront ? (
                                                <div className="h-24 relative rounded-lg overflow-hidden">
                                                    <img src={previews.docFront} className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="py-2">
                                                    <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                                    <p className="text-[10px] font-bold text-gray-600">Doc Frente</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors bg-gray-50 group">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'documentBackUrl', 'docBack')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            {previews.docBack ? (
                                                <div className="h-24 relative rounded-lg overflow-hidden">
                                                    <img src={previews.docBack} className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="py-2">
                                                    <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                                                    <p className="text-[10px] font-bold text-gray-600">Doc Verso</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Financeiro */}
                    {currentStep === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Landmark className="h-5 w-5 text-indigo-500" /> Configuração de Repasses
                                </h3>
                                <p className="text-sm text-gray-500">Como você receberá o valor dos ingressos vendidos</p>
                            </div>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                        <img src="https://www.asaas.com/assets/favicon/favicon-32x32.png" className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-indigo-900 font-bold">Integração com Asaas</h4>
                                        <p className="text-sm text-indigo-700/80 mt-1">
                                            Utilizamos o Asaas para processar pagamentos e realizar o split automático de comissões de forma segura.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-white rounded-2xl p-6 border border-indigo-100">
                                        <h5 className="text-gray-900 font-bold mb-2">Ainda não tem conta no Asaas?</h5>
                                        <p className="text-xs text-gray-500 mb-4">Crie sua conta agora mesmo. É rápido e gratuito para começar.</p>
                                        <a
                                            href="https://www.asaas.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline"
                                        >
                                            Criar minha conta no Asaas <ArrowRight className="h-4 w-4" />
                                        </a>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 block">Sua API Key do Asaas</label>
                                        <div className="relative">
                                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                name="asaasApiKey"
                                                value={formData.asaasApiKey}
                                                onChange={handleInputChange}
                                                className="pl-10"
                                                placeholder="$a2p_..."
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                            Atenção: Sem esta chave você só poderá criar eventos gratuitos.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-white/50 rounded-2xl border border-white">
                                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                        Seus dados bancários e chaves são criptografados e utilizados apenas para o processamento de pagamentos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Feed / Social */}
                    {currentStep === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Camera className="h-5 w-5 text-indigo-500" /> Seu Feed Profissional
                                </h3>
                                <p className="text-sm text-gray-500">Adicione fotos de seus eventos passados ou de sua infraestrutura para sua FanPage.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {/* Upload Button */}
                                    <div className="relative aspect-square rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center group hover:border-indigo-400 transition-all cursor-pointer">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handlePhotoFeedUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <Upload className="h-6 w-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase mt-2">Adicionar Fotos</span>
                                    </div>

                                    {/* Feed Previews */}
                                    {feedPosts.map((post) => (
                                        <div key={post.id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm text-right">
                                            <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => removeFeedPhoto(post.id)}
                                                    className="h-8 w-8 p-0 rounded-full"
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4 items-start">
                                <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-1" />
                                <div className="text-sm">
                                    <h4 className="font-bold text-amber-900">Dica de Elite</h4>
                                    <p className="text-amber-800/80 mt-1">
                                        Fotos de alta qualidade de seus eventos anteriores geram mais confiança para seus novos clientes.
                                        Capriche na seleção!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="mt-8 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={currentStep === 1 || saving}
                        className="text-gray-500 font-bold uppercase tracking-tighter gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </Button>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="link"
                            onClick={skipOnboarding}
                            disabled={saving}
                            className="text-gray-400 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest hidden sm:block"
                        >
                            Fazer mais tarde
                        </Button>
                        <p className="hidden sm:block text-xs font-bold text-gray-400 uppercase tracking-widest px-4 border-l border-gray-200">
                            Passo {currentStep} de 4
                        </p>
                        {currentStep < 4 ? (
                            <Button
                                onClick={nextStep}
                                disabled={loading || saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-tighter px-8 h-12 rounded-2xl shadow-lg shadow-indigo-100 gap-2"
                            >
                                {saving ? 'Salvando...' : 'Próxima Etapa'} <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={finishOnboarding}
                                disabled={loading || saving}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tighter px-10 h-12 rounded-2xl shadow-lg shadow-emerald-100 gap-2 animate-bounce hover:animate-none"
                            >
                                {saving ? 'Salvando...' : 'Concluir Cadastro'} <CheckCircle2 className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizerOnboarding;
