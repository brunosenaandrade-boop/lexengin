'use client';

import Link from 'next/link';
import {
  Calculator,
  Users,
  Briefcase,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowRight,
  Scale,
  Gavel,
  Heart,
  Shield,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Mock data - will be replaced with real data from tRPC
const stats = {
  processosAtivos: 45,
  prazosProximos: 8,
  clientesTotal: 127,
  honorariosReceber: 45600,
};

const prazosProximos = [
  {
    id: '1',
    processo: '0001234-56.2024.8.26.0100',
    tipo: 'Contestação',
    vencimento: '2024-12-29',
    diasRestantes: 2,
    urgente: true,
  },
  {
    id: '2',
    processo: '0002345-67.2024.8.26.0100',
    tipo: 'Réplica',
    vencimento: '2024-12-31',
    diasRestantes: 4,
    urgente: false,
  },
  {
    id: '3',
    processo: '0003456-78.2024.8.26.0100',
    tipo: 'Apelação',
    vencimento: '2025-01-05',
    diasRestantes: 9,
    urgente: false,
  },
];

const ultimasMovimentacoes = [
  {
    id: '1',
    processo: '0001234-56.2024.8.26.0100',
    descricao: 'Despacho: Cite-se a parte ré',
    data: '2024-12-27',
  },
  {
    id: '2',
    processo: '0005678-90.2024.8.26.0100',
    descricao: 'Sentença proferida - Procedente',
    data: '2024-12-26',
  },
  {
    id: '3',
    processo: '0009876-54.2024.8.26.0100',
    descricao: 'Manifestação da parte autora juntada',
    data: '2024-12-26',
  },
];

const calculadorasRapidas = [
  { title: 'FGTS', href: '/calculadoras/trabalhista/fgts', icon: Scale, area: 'Trabalhista' },
  { title: 'Dosimetria', href: '/calculadoras/criminal/dosimetria', icon: Gavel, area: 'Criminal' },
  { title: 'Pensão', href: '/calculadoras/familia/pensao', icon: Heart, area: 'Família' },
  { title: 'Correção', href: '/calculadoras/civel/correcao-monetaria', icon: DollarSign, area: 'Cível' },
  { title: 'INSS', href: '/calculadoras/previdenciario/inss', icon: Shield, area: 'Previdenciário' },
  { title: 'Horas Extras', href: '/calculadoras/trabalhista/horas-extras', icon: Clock, area: 'Trabalhista' },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao LexEngine</h1>
        <p className="text-muted-foreground">
          Seu escritório jurídico completo em uma única plataforma.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              +3 novos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prazos Próximos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prazosProximos}</div>
            <p className="text-xs text-muted-foreground">
              2 urgentes (menos de 3 dias)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientesTotal}</div>
            <p className="text-xs text-muted-foreground">
              +12 novos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Honorários a Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(stats.honorariosReceber)}
            </div>
            <p className="text-xs text-muted-foreground">
              15 pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prazos Próximos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Prazos Próximos
                </CardTitle>
                <CardDescription>Prazos que vencem nos próximos 10 dias</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/processos?filter=prazos">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {prazosProximos.map((prazo) => (
                <div
                  key={prazo.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{prazo.tipo}</p>
                    <p className="text-xs text-muted-foreground">{prazo.processo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {prazo.urgente ? (
                      <Badge variant="destructive">{prazo.diasRestantes} dias</Badge>
                    ) : (
                      <Badge variant="secondary">{prazo.diasRestantes} dias</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Últimas Movimentações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Últimas Movimentações
                </CardTitle>
                <CardDescription>Atualizações recentes dos processos</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/processos">Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ultimasMovimentacoes.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm">{mov.descricao}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{mov.processo}</p>
                      <p className="text-xs text-muted-foreground">{mov.data}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculadoras Rápidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadoras Jurídicas
              </CardTitle>
              <CardDescription>Acesso rápido às calculadoras mais utilizadas</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/calculadoras">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {calculadorasRapidas.map((calc) => (
              <Link
                key={calc.href}
                href={calc.href}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <calc.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{calc.title}</p>
                  <p className="text-xs text-muted-foreground">{calc.area}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button className="h-auto py-4 flex flex-col gap-2" asChild>
          <Link href="/processos/novo">
            <Briefcase className="h-5 w-5" />
            <span>Novo Processo</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
          <Link href="/clientes/novo">
            <Users className="h-5 w-5" />
            <span>Novo Cliente</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
          <Link href="/documentos/novo">
            <FileText className="h-5 w-5" />
            <span>Novo Documento</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
          <Link href="/agenda/novo">
            <Calendar className="h-5 w-5" />
            <span>Novo Evento</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
