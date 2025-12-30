'use client';

import Link from 'next/link';
import {
  Calculator,
  Building,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const calculadoras = [
  {
    title: 'FGTS',
    description: 'Correção de saldo do FGTS com TR e juros de 3% a.a. Inclui opção de cálculo com TR+SELIC para ações revisionais.',
    href: '/calculadoras/trabalhista/fgts',
    icon: Building,
    popular: true,
    fields: ['Saldo inicial', 'Período', 'Depósitos mensais', 'Tipo de correção'],
  },
  {
    title: 'Verbas Rescisórias',
    description: 'Cálculo completo de rescisão de contrato de trabalho, incluindo todas as verbas devidas conforme tipo de demissão.',
    href: '/calculadoras/trabalhista/verbas-rescisorias',
    icon: FileText,
    popular: true,
    fields: ['Salário', 'Data admissão/demissão', 'Tipo de rescisão', 'Férias vencidas'],
  },
  {
    title: 'Horas Extras',
    description: 'Cálculo de horas extras com todos os percentuais (50%, 100%) e reflexos em DSR, férias, 13º e FGTS.',
    href: '/calculadoras/trabalhista/horas-extras',
    icon: Clock,
    popular: true,
    fields: ['Salário-hora', 'Quantidade de horas', 'Percentual', 'Reflexos'],
  },
  {
    title: 'Adicional Noturno',
    description: 'Adicional de 20% sobre hora noturna (22h às 5h) com hora ficta de 52m30s e reflexos.',
    href: '/calculadoras/trabalhista/adicional-noturno',
    icon: Clock,
    fields: ['Salário', 'Horas noturnas', 'Reflexos'],
  },
  {
    title: 'Férias',
    description: 'Cálculo de férias vencidas, proporcionais e em dobro, com adicional de 1/3 constitucional.',
    href: '/calculadoras/trabalhista/ferias',
    icon: Calendar,
    fields: ['Salário', 'Período aquisitivo', 'Dias de férias', 'Abono pecuniário'],
  },
  {
    title: '13º Salário',
    description: 'Décimo terceiro salário proporcional e integral, com descontos de INSS e IRRF.',
    href: '/calculadoras/trabalhista/decimo-terceiro',
    icon: DollarSign,
    fields: ['Salário', 'Meses trabalhados', 'Descontos'],
  },
  {
    title: 'Multa 40% FGTS',
    description: 'Multa rescisória de 40% sobre os depósitos do FGTS durante o contrato de trabalho.',
    href: '/calculadoras/trabalhista/multa-fgts',
    icon: DollarSign,
    fields: ['Saldo FGTS', 'Depósitos do contrato'],
  },
  {
    title: 'Aviso Prévio',
    description: 'Aviso prévio proporcional ao tempo de serviço (3 dias por ano, até 90 dias) conforme Lei 12.506/2011.',
    href: '/calculadoras/trabalhista/aviso-previo',
    icon: FileText,
    fields: ['Salário', 'Tempo de serviço', 'Tipo de aviso'],
  },
];

export default function TrabalhistaCalculadorasPage() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/calculadoras">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-blue-500" />
            Calculadoras Trabalhistas
          </h1>
          <p className="text-muted-foreground mt-1">
            Cálculos de verbas trabalhistas e rescisórias
          </p>
        </div>
      </div>

      {/* Grid de calculadoras */}
      <div className="grid gap-4 md:grid-cols-2">
        {calculadoras.map((calc) => (
          <Card key={calc.href} className="group hover:shadow-md transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <calc.icon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{calc.title}</CardTitle>
                    {calc.popular && (
                      <Badge variant="secondary" className="mt-1">Popular</Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">{calc.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Campos principais:</p>
                <div className="flex flex-wrap gap-1">
                  {calc.fields.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href={calc.href}>
                  Acessar Calculadora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Calculator className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">Fundamentação Legal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os cálculos trabalhistas seguem a CLT (Consolidação das Leis do Trabalho),
                Lei 8.036/90 (FGTS), Lei 12.506/2011 (Aviso Prévio Proporcional) e demais
                normas aplicáveis. A correção monetária utiliza índices oficiais conforme
                a legislação vigente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
