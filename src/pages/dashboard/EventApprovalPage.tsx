import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  MessageSquare,
  Calendar,
  User,
  Clock,
  ArrowRight,
  Star
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { masterService } from '@/services/masterService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const EventApprovalPage = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await masterService.getPendingEvents();
      setEvents(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar eventos',
        description: 'Não foi possível buscar os eventos pendentes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await masterService.approveEvent(id);
      setIsModalOpen(false);
      loadEvents();
      toast({
        title: 'Evento publicado!',
        description: 'O evento agora está visível e ativo para vendas.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao aprovar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      await masterService.toggleFeaturedEvent(id, !currentStatus);
      loadEvents();
      toast({
        title: !currentStatus ? 'Evento em destaque!' : 'Removido dos destaques',
        description: !currentStatus ? 'O evento agora aparecerá no carrossel da home.' : 'O evento não aparecerá mais no carrossel.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar destaque',
        variant: 'destructive',
      });
    }
  };

  // Lógica de validação do que falta
  const getMissingReport = (event: any) => {
    const org = event.organizer || {};
    const missing: { type: 'producer' | 'event', item: string }[] = [];

    // Validação do Produtor
    if (!org.profileComplete) {
      if (!org.cpf && !org.cnpj) missing.push({ type: 'producer', item: 'CPF ou CNPJ não informado' });
      if (!org.rg && !org.cnpj) missing.push({ type: 'producer', item: 'RG não informado' });
      if (!org.address) missing.push({ type: 'producer', item: 'Endereço fiscal incompleto' });
      if (!org.logoUrl) missing.push({ type: 'producer', item: 'Logo da produtora ausente' });
      // Simulação de falta de documentos físicos (como o usuário solicitou)
      missing.push({ type: 'producer', item: 'Cópia do documento de identidade não enviada' });
    }

    // Validação do Evento
    if (!event.imageUrl || event.imageUrl.includes('unsplash')) missing.push({ type: 'event', item: 'Banner do evento genérico ou ausente' });
    if (!event.description || event.description.length < 50) missing.push({ type: 'event', item: 'Descrição muito curta' });
    if (!event.locationAddress) missing.push({ type: 'event', item: 'Endereço exato do local não definido' });

    return missing;
  };

  const openValidationModal = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const renderStatusBadge = (event: any) => {
    const missing = getMissingReport(event);
    const isPending = event.status === 'pending';

    if (isPending) {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-bold uppercase text-[10px] tracking-tighter">
          <AlertTriangle className="w-3 h-3 mr-1" /> Aguard. Aprovação
        </Badge>
      );
    }
    if (missing.length === 0) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold uppercase text-[10px] tracking-tighter">
          <CheckCircle className="w-3 h-3 mr-1" /> Completo
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-bold uppercase text-[10px] tracking-tighter">
        <AlertTriangle className="w-3 h-3 mr-1" /> Incompleto
      </Badge>
    );
  };

  const renderEventStatusPill = (status: string) => {
    if (status === 'pending') {
      return <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Produtor Incompleto</span>;
    }
    return <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rascunho</span>;
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Aprovação de Eventos</h1>
            <p className="text-gray-600 font-medium">Revise as submissões e valide a integridade dos dados antes da publicação.</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Total Pendente</span>
            <span className="text-2xl font-black text-indigo-600 leading-none">{events.length}</span>
          </div>
        </div>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-black text-gray-400 uppercase tracking-widest">Fila de Revisão</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <CheckCircle className="h-12 w-12 text-emerald-400 mb-2" />
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Tudo em dia!</h3>
                <p className="text-sm text-gray-500 max-w-xs">Não há eventos aguardando aprovação no momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left font-black text-gray-900 uppercase tracking-tighter">Evento</th>
                      <th className="px-6 py-4 text-left font-black text-gray-900 uppercase tracking-tighter">Organizador</th>
                      <th className="px-6 py-4 text-left font-black text-gray-900 uppercase tracking-tighter">Data/Hora</th>
                      <th className="px-6 py-4 text-left font-black text-gray-900 uppercase tracking-tighter">Integridade</th>
                      <th className="px-6 py-4 text-left font-black text-gray-900 uppercase tracking-tighter">Destaque</th>
                      <th className="px-6 py-4 text-right font-black text-gray-900 uppercase tracking-tighter">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.map((event) => {
                      const missing = getMissingReport(event);
                      return (
                        <tr key={event.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                                <img src={event.bannerUrl || event.imageUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <div className="font-black text-gray-900 uppercase tracking-tight">{event.title}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">{event.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-bold text-gray-700">{event.organizer?.name || 'Sistema'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-gray-600 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Clock className="w-3 h-3" /> {event.time}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 flex-col items-start">
                              {renderStatusBadge(event)}
                              {renderEventStatusPill(event.status)}
                              {missing.length > 0 && (
                                <button
                                  onClick={() => openValidationModal(event)}
                                  className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors shadow-sm"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant={event.isFeatured ? "default" : "outline"}
                                onClick={() => handleToggleFeatured(event.id, !!event.isFeatured)}
                                className={`h-8 rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2 ${event.isFeatured ? 'bg-indigo-600' : 'text-gray-400'}`}
                              >
                                <Star className={`w-3 h-3 ${event.isFeatured ? 'fill-current' : ''}`} />
                                {event.isFeatured ? 'Destaque ON' : 'Destacar'}
                              </Button>
                              {event.featuredPaymentStatus === 'paid' ? (
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1 animate-pulse">★ Pago</span>
                              ) : event.featuredPaymentStatus === 'pending' ? (
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1">★ Pagamento Pendente</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              onClick={() => handleApprove(event.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tighter text-xs h-9 rounded-xl shadow-lg shadow-emerald-100"
                            >
                              Aprovar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white border-2 border-gray-100 rounded-3xl shadow-2xl p-0 overflow-hidden text-gray-900">
          <DialogHeader className="p-6 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle className="text-xl font-black text-amber-900 uppercase tracking-tighter">Relatório de Pendências</DialogTitle>
            </div>
            <DialogDescription className="text-amber-700 font-medium">
              O evento foi submetido mas identificamos informações ausentes no cadastro do produtor ou do evento.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="prose prose-sm max-w-none">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dados Faltantes (Markdown)</h4>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 font-mono text-xs whitespace-pre-wrap text-gray-700">
                {selectedEvent && (
                  <>
                    {`### Pendências para: ${selectedEvent.title}\n\n`}
                    {`**Status do Produtor:** ${selectedEvent.organizer?.profileComplete ? '✅ Regular' : '⚠️ Incompleto'}\n`}
                    {getMissingReport(selectedEvent).map(m => `- [ ] ${m.item}`).join('\n')}
                    {`\n\n**Ação sugerida:** Solicitar regularização via WhatsApp.`}
                  </>
                )}
              </div>
            </div>

            <Button
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-tighter rounded-2xl gap-3 shadow-lg shadow-emerald-100 group"
              onClick={() => toast({ title: "WhatsApp", description: "Configurações de integração pendentes" })}
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Enviar para o WhatsApp do Produtor
            </Button>
          </div>

          <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100 gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold uppercase text-xs tracking-widest text-gray-400 hover:text-gray-900">
              Fechar
            </Button>
            <Button
              onClick={() => handleApprove(selectedEvent?.id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-tighter text-xs h-10 px-6 rounded-xl"
            >
              Aprovar Mesmo Assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EventApprovalPage;
