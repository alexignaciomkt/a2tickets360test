import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag, FileText, MapPin, Ticket, CheckCircle2,
  ArrowLeft, ArrowRight, Camera, Calendar, Clock,
  Users, DollarSign, Sparkles, Save, Send, ShieldCheck, Star, QrCode
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizerService';
import EventWizardStepper from '@/components/events/EventWizardStepper';
import CategoryCombobox from '@/components/events/CategoryCombobox';
import TicketBuilder, { TicketTier } from '@/components/events/TicketBuilder';
import EventPreviewCard from '@/components/events/EventPreviewCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const STEPS = [
  { number: 1, title: 'Tipo & Categoria', icon: <Tag className="h-4 w-4" /> },
  { number: 2, title: 'Informações', icon: <FileText className="h-4 w-4" /> },
  { number: 3, title: 'Data & Local', icon: <MapPin className="h-4 w-4" /> },
  { number: 4, title: 'Ingressos', icon: <Ticket className="h-4 w-4" /> },
  { number: 5, title: 'Revisão', icon: <CheckCircle2 className="h-4 w-4" /> },
];

const CreateEvent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wantsHighlight, setWantsHighlight] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);

  // Renderização do Aviso de Perfil Incompleto (Não bloqueante)
  const renderProfileWarning = () => {
    if (user?.role === 'organizer' && !user.profileComplete) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="p-2 bg-amber-100 rounded-xl">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Cadastro Incompleto</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Seu perfil ainda não possui todos os documentos e informações fiscais necessários.
              Você pode criar o evento, mas ele precisará de validação extra da nossa equipe.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/organizer/onboarding')}
            className="text-amber-700 hover:bg-amber-100 font-bold uppercase text-[10px] tracking-widest"
          >
            Completar Agora →
          </Button>
        </div>
      );
    }
    return null;
  };

  // Form State
  const [eventType, setEventType] = useState<'paid' | 'free'>('paid');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationPostalCode, setLocationPostalCode] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [tickets, setTickets] = useState<TicketTier[]>([
    { id: `temp_${Date.now()}`, name: '', price: 0, quantity: 100, category: 'standard' }
  ]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Mostrar preview local imediato
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // 2. Upload para o servidor
      try {
        const { url: remoteUrl } = await organizerService.uploadImage(file);
        setImageUrl(remoteUrl);
      } catch (err) {
        console.error('Erro no upload da imagem:', err);
        toast({
          variant: 'destructive',
          title: 'Erro no Upload',
          description: 'Não foi possível salvar a imagem no servidor. Tente novamente.'
        });
      }
    }
  };

  const handleCepBlur = async () => {
    const cep = locationPostalCode.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setLocationAddress(prev => prev || `${data.logradouro}, ${data.bairro}`);
        setLocationCity(data.localidade);
        setLocationState(data.uf);
      }
    } catch (err) {
      console.warn('Erro ao buscar CEP:', err);
    }
  };

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 1: return !!category;
      case 2: return title.length >= 1 && description.length >= 10;
      case 3: return !!date && !!time && !!locationName && !!locationAddress && capacity > 0;
      case 4: return tickets.length > 0 && tickets.every(t => t.name.trim().length > 0 && t.quantity > 0);
      default: return true;
    }
  };

  const nextStep = () => {
    if (currentStep < 5 && canAdvance()) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const eventData = {
        organizerId: user.id,
        title, description, category, eventType, date, time, endDate, endTime, duration,
        locationName, locationAddress, locationCity, locationState, locationPostalCode,
        capacity, status,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
        isFeatured: wantsHighlight,
        featuredPaymentStatus: wantsHighlight ? 'pending' : 'none',
      };
      const newEvent = await organizerService.createEvent(eventData);
      for (const ticket of tickets) {
        await organizerService.createTicket(newEvent.id, {
          name: ticket.name, price: ticket.price, quantity: ticket.quantity, category: ticket.category,
        });
      }

      // The backend returns forcedToPending=true if the organizer's profile was incomplete
      const wasForcedToPending = (newEvent as any).forcedToPending === true;

      if (status === 'draft') {
        toast({ title: '💾 Rascunho salvo!', description: 'Você pode continuar editando.' });
      } else if (wasForcedToPending) {
        toast({
          title: '⏳ Evento enviado para análise!',
          description: 'Seu cadastro ainda está incompleto. O evento será publicado após aprovação do Admin Master.',
        });
      } else {
        toast({ title: '🚀 Evento publicado!', description: 'Seu evento está no ar!' });
      }
      navigate('/organizer/events');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar evento', description: error.message || 'Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== RENDER STEPS =====

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tipo do Evento</h3>
        <p className="text-sm text-gray-500 mb-4">Seu evento terá ingressos pagos ou será gratuito?</p>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setEventType('paid')}
            className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group
              ${eventType === 'paid'
                ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all
              ${eventType === 'paid' ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
              <DollarSign className={`h-6 w-6 ${eventType === 'paid' ? 'text-indigo-600' : 'text-gray-400'}`} />
            </div>
            <h4 className={`font-semibold text-lg mb-1 ${eventType === 'paid' ? 'text-gray-900' : 'text-gray-600'}`}>Evento Pago</h4>
            <p className="text-sm text-gray-500">Venda ingressos com diferentes lotes e categorias</p>
            {eventType === 'paid' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </button>

          <button type="button" onClick={() => {
            setEventType('free');
            setTickets(prev => prev.map(t => ({
              ...t,
              price: 0,
              name: t.name || 'Inscrição Gratuita'
            })));
          }}
            className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group
              ${eventType === 'free'
                ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all
              ${eventType === 'free' ? 'bg-emerald-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
              <Users className={`h-6 w-6 ${eventType === 'free' ? 'text-emerald-600' : 'text-gray-400'}`} />
            </div>
            <h4 className={`font-semibold text-lg mb-1 ${eventType === 'free' ? 'text-gray-900' : 'text-gray-600'}`}>Evento Gratuito</h4>
            <p className="text-sm text-gray-500">Inscrição gratuita com controle de participantes</p>
            {eventType === 'free' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Categoria</h3>
        <p className="text-sm text-gray-500 mb-4">
          Selecione uma categoria existente ou crie uma nova. Categorias criadas ficam disponíveis para todos os produtores.
        </p>
        <CategoryCombobox value={category} onChange={setCategory} />
        {category && (
          <div className="mt-3 flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200">
              {category}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Informações Básicas</h3>
        <p className="text-sm text-gray-500 mb-6">Como seu evento será apresentado ao público</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Título do Evento *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: 1ª Feira de Negócios de São José dos Campos"
          className="bg-white border-gray-300 text-gray-900 text-lg placeholder:text-gray-400 focus:border-indigo-500 h-12" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Descrição *</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva seu evento de forma atrativa..."
          rows={5}
          className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 resize-none" />
        <p className="text-xs text-gray-400 mt-1">{description.length} caracteres (mínimo 10)</p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Banner / Arte do Evento</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors relative cursor-pointer group bg-gray-50">
          <input type="file" accept="image/*" onChange={handleImageChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          {previewUrl ? (
            <div className="relative h-56 w-full rounded-lg overflow-hidden">
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <p className="text-white font-medium">Clique para alterar</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4">
              <div className="h-14 w-14 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-all">
                <Camera className="h-7 w-7 text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Clique para fazer upload</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP (Max. 5MB)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Data, Horário & Localização</h3>
        <p className="text-sm text-gray-500 mb-6">Quando e onde acontecerá seu evento</p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-500" /> Data & Horário
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Início do Evento</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Data *</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 focus:border-indigo-500 h-11" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Horário *</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 focus:border-indigo-500 h-11" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Término do Evento</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Data de Término</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 focus:border-rose-500 h-11" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Horário de Término</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900 focus:border-rose-500 h-11" />
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Duração estimada ou Observação</label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 8 horas ou 'Até o último convidado'"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 h-11" />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-indigo-500" /> Localização
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nome do Local *</label>
            <Input value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Ex: Centro de Convenções"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">CEP</label>
            <Input value={locationPostalCode} onChange={(e) => setLocationPostalCode(e.target.value)} onBlur={handleCepBlur} placeholder="12345-000"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Endereço *</label>
            <Input value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="Ex: Av. Principal, 1000 - Centro"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
            <Input value={locationCity} onChange={(e) => setLocationCity(e.target.value)} placeholder="Ex: São José dos Campos"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Estado</label>
            <Input value={locationState} onChange={(e) => setLocationState(e.target.value)} placeholder="Ex: SP"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500" />
          </div>
        </div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-500" /> Capacidade
        </h4>
        <div className="max-w-xs">
          <label className="text-xs text-gray-500 mb-1 block">Capacidade Máxima *</label>
          <Input type="number" value={capacity} onChange={(e) => setCapacity(parseInt(e.target.value) || 0)} placeholder="1000"
            className="bg-white border-gray-300 text-gray-900 focus:border-indigo-500" />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {eventType === 'free' ? 'Configurar Inscrição' : 'Configurar Ingressos'}
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {eventType === 'free' ? 'Defina como os participantes se inscreverão' : 'Crie os lotes e categorias de ingressos'}
        </p>
      </div>
      <TicketBuilder tickets={tickets} onChange={setTickets} eventType={eventType} />
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Revisão Final</h3>
        <p className="text-sm text-gray-500 mb-6">Confira tudo antes de publicar. Você poderá editar depois.</p>
      </div>
      <EventPreviewCard data={{
        eventType, category, title, description,
        imageUrl: previewUrl || imageUrl,
        date, time, duration, locationName, locationAddress, locationCity, locationState, capacity, tickets,
      }} />

      {/* Seção de Promoção / Monetização */}
      <div className={`mt-8 p-6 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden relative group
        ${wantsHighlight
          ? 'border-indigo-500 bg-indigo-50/50 shadow-2xl shadow-indigo-100'
          : 'border-gray-100 bg-white hover:border-gray-200'}`}>

        {wantsHighlight && (
          <div className="absolute top-0 right-0 p-4 bg-indigo-500 text-white rounded-bl-3xl animate-in zoom-in duration-300">
            <Star className="w-6 h-6 fill-current" />
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110
            ${wantsHighlight ? 'bg-indigo-600 text-white drop-shadow-xl' : 'bg-gray-100 text-gray-400'}`}>
            <Star className={`w-10 h-10 ${wantsHighlight ? 'fill-current' : ''}`} />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">Destaque seu Evento na Home</h4>
            <p className="text-sm text-gray-500 font-medium">
              Sua arte aparecerá no carrossel principal da plataforma por 30 dias.
              Ideal para aumentar a visibilidade e as vendas.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="text-2xl font-black text-indigo-600 tracking-tighter">R$ 49,90</div>
            <Button
              type="button"
              onClick={() => {
                if (!wantsHighlight) setShowPixModal(true);
                setWantsHighlight(!wantsHighlight);
              }}
              variant={wantsHighlight ? "default" : "outline"}
              className={`rounded-full h-12 px-8 font-black uppercase text-xs tracking-widest transition-all
                ${wantsHighlight ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              {wantsHighlight ? 'Destaque Selecionado' : 'Selecionar Destaque'}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="button" onClick={() => handleSubmit('draft')} disabled={isSubmitting}
          variant="outline" className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50 gap-2 h-12">
          <Save className="h-4 w-4" />
          {isSubmitting ? 'Salvando...' : 'Salvar como Rascunho'}
        </Button>
        <Button type="button" onClick={() => handleSubmit('published')} disabled={isSubmitting}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white gap-2 h-12 shadow-lg shadow-indigo-200">
          <Send className="h-4 w-4" />
          {isSubmitting
            ? (user?.profileComplete ? 'Publicando...' : 'Enviando...')
            : (user?.profileComplete ? 'Publicar Evento' : 'Solicitar Publicação')}
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardLayout userType="organizer">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/organizer/events')}
            className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-500" /> Criar Novo Evento
            </h1>
            <p className="text-sm text-gray-500 mt-1">Siga as etapas para configurar seu evento completo</p>
          </div>
        </div>

        <EventWizardStepper steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

        {renderProfileWarning()}

        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 min-h-[400px] shadow-sm">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        {currentStep < 5 && (
          <div className="flex justify-between items-center">
            <Button type="button" variant="ghost" onClick={prevStep} disabled={currentStep === 1}
              className="text-gray-500 hover:text-gray-900 gap-2">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              Etapa {currentStep} de 5
            </div>
            <Button type="button" onClick={nextStep} disabled={!canAdvance()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* PIX Payment Modal Simulation */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-md bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden text-gray-900">
          <DialogHeader className="p-8 bg-indigo-600 text-white">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <QrCode className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none">Pagamento via PIX</DialogTitle>
            </div>
            <DialogDescription className="text-indigo-100 font-medium opacity-90">
              Escaneie o código abaixo para ativar o destaque do seu evento imediatamente.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 flex flex-col items-center gap-6">
            <div className="p-4 bg-white border-2 border-indigo-100 rounded-[2rem] shadow-inner relative group">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=simulated-pix-payment"
                alt="PIX QR Code"
                className="w-48 h-48 rounded-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] cursor-pointer">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Copiar Código PIX</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="flex justify-between items-center text-sm font-bold border-b border-gray-100 pb-3">
                <span className="text-gray-400 uppercase tracking-widest text-[10px]">Serviço</span>
                <span className="text-gray-900">Destaque 30 Dias - Home</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Total</span>
                <span className="text-2xl font-black text-indigo-600 tracking-tighter">R$ 49,90</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest leading-relaxed">
              * O destaque será ativado após a confirmação do pagamento pelo nosso sistema financeiro.
            </p>
          </div>

          <DialogFooter className="p-8 bg-gray-50 border-t border-gray-100">
            <Button
              onClick={() => setShowPixModal(false)}
              className="w-full h-14 bg-gray-900 hover:bg-indigo-600 text-white font-black uppercase tracking-tighter rounded-2xl transition-all shadow-lg active:scale-95"
            >
              Já realizei o pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreateEvent;
