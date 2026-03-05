
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/services/api';
import { Mail, User, Lock, Phone, CreditCard, Loader2, CheckCircle, ChevronDown, Rocket, Shield, BarChart3, Calendar, Sparkles, Users, Camera } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres'),
  mobilePhone: z.string().min(10, 'Telefone inválido'),
  cpfCnpj: z.string().min(11, 'CPF ou CNPJ inválido'),
  slug: z.string().min(3, 'O link deve ter pelo menos 3 caracteres').regex(/^[a-z0-0-]+$/, 'Use apenas letras minúsculas, números e hifens'),
  bannerUrl: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterOrganizerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      mobilePhone: '',
      cpfCnpj: '',
      slug: '',
      bannerUrl: '',
    },
  });

  // Gerar slug automático ao digitar o nome
  const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue('name', name);

    // Se o slug ainda não foi editado manualmente ou está vazio
    const currentSlug = form.getValues('slug');
    const autoSlug = name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    form.setValue('slug', autoSlug);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload', formData);
      form.setValue('bannerUrl', res.url);
      toast({
        title: 'Capa enviada!',
        description: 'Sua foto de capa foi carregada com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: 'Não foi possível carregar a imagem.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/api/organizers/register', data);
      setIsSuccess(true);
      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu e-mail para ativar sua conta de organizador.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no cadastro',
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Calendar,
      title: 'Eventos Ilimitados',
      description: 'Publique quantos eventos quiser sem limitações'
    },
    {
      icon: Users,
      title: 'Gestão Completa',
      description: 'Controle total sobre inscrições e check-ins'
    },
    {
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Analytics completos sobre seus eventos'
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Plataforma segura com suporte dedicado'
    }
  ];

  return (
    <MainLayout>
      <div className="bg-[#050505] min-h-screen py-20 flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {isSuccess ? (
              <div className="max-w-xl mx-auto bg-[#0A0A0A] border border-white/5 p-10 rounded-3xl text-center shadow-2xl">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Mail className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4 italic uppercase tracking-tighter">Verifique seu E-mail</h2>
                <p className="text-gray-400 mb-8 text-lg">
                  Enviamos um link de ativação para o seu e-mail de organizador. <br />
                  <strong>Ative sua conta para começar a vender.</strong>
                </p>
                <Button
                  className="w-full h-14 rounded-2xl bg-white text-black hover:bg-gray-200 font-bold uppercase tracking-widest"
                  onClick={() => navigate('/login')}
                >
                  Ir para o Login
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Benefits Col */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-2">
                    <Rocket className="w-4 h-4 text-indigo-400 mr-2" />
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Área do Produtor</span>
                  </div>

                  <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-6">
                    Sua Produtora <br />
                    <span className="text-indigo-400">com Gestão de Elite.</span>
                  </h1>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                        <benefit.icon className="w-6 h-6 text-indigo-400 mb-3" />
                        <h3 className="text-white font-bold text-sm uppercase mb-1 tracking-tight">{benefit.title}</h3>
                        <p className="text-gray-500 text-[10px] leading-tight">{benefit.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Col */}
                <div className="lg:col-span-7">
                  <div className="bg-[#0A0A0A] border border-white/5 p-8 md:p-10 rounded-3xl shadow-2xl">
                    <div className="mb-8">
                      <Button variant="ghost" onClick={() => navigate('/register')} className="text-indigo-400 hover:text-indigo-300 p-0 h-auto font-bold flex items-center group">
                        <ChevronDown className="w-4 h-4 rotate-90 mr-1 group-hover:-translate-x-1 transition-transform" /> Voltar para Escolha
                      </Button>
                    </div>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">Nome Fantasia / Empresa</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <Input
                                      placeholder="A2 Produções"
                                      className="h-14 bg-[#111] border-white/5 rounded-2xl pl-12 text-white placeholder:text-gray-700 focus:ring-indigo-500"
                                      {...field}
                                      onChange={onNameChange}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">Link da sua Página (Slug)</FormLabel>
                                <div className="flex gap-2">
                                  <div className="flex-1 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-bold">ticketera.com/produtor/</span>
                                    <Input
                                      placeholder="sua-produtora"
                                      className="h-14 bg-[#111] border-white/5 rounded-2xl pl-[165px] text-indigo-400 font-bold placeholder:text-gray-700 focus:ring-indigo-500"
                                      {...field}
                                    />
                                  </div>
                                </div>
                                <p className="text-[10px] text-gray-500 pl-1 mt-1 font-medium">Este será o endereço público da sua empresa na plataforma.</p>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">E-mail Corporativo</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <Input type="email" placeholder="contato@empresa.com" className="h-14 bg-[#111] border-white/5 rounded-2xl pl-12 text-white placeholder:text-gray-700 focus:ring-indigo-500" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="cpfCnpj"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">CPF ou CNPJ</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <Input placeholder="00.000.000/0001-00" className="h-14 bg-[#111] border-white/5 rounded-2xl pl-12 text-white placeholder:text-gray-700 focus:ring-indigo-500" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="mobilePhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">WhatsApp de Contato</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <Input placeholder="(11) 99999-9999" className="h-14 bg-[#111] border-white/5 rounded-2xl pl-12 text-white placeholder:text-gray-700 focus:ring-indigo-500" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="md:col-span-2">
                            <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1 mb-2 block">Foto de Capa (Opcional)</FormLabel>
                            <div className="relative w-full h-32 bg-[#111] border border-dashed border-white/10 rounded-2xl overflow-hidden group hover:border-indigo-500/50 transition-all">
                              {form.watch('bannerUrl') ? (
                                <img src={form.watch('bannerUrl')} className="w-full h-full object-cover" alt="Banner Preview" />
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                  <Camera className="w-8 h-8 mb-2" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Enviar Capa</span>
                                </div>
                              )}
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                accept="image/*"
                              />
                            </div>
                          </div>

                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">Defina sua Senha</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <Input type="password" placeholder="Mínimo 8 caracteres" className="h-14 bg-[#111] border-white/5 rounded-2xl pl-12 text-white placeholder:text-gray-700 focus:ring-indigo-500" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-lg shadow-xl shadow-indigo-500/20 mt-4 transition-all"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            "Ativar meu Acesso"
                          )}
                        </Button>
                      </form>
                    </Form>

                    <div className="mt-8 text-center">
                      <p className="text-gray-500 text-sm font-medium">
                        Já é um produtor parceiro?{' '}
                        <Link to="/login" className="text-indigo-400 font-black hover:underline">
                          Entrar Agora
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default RegisterOrganizerPage;
