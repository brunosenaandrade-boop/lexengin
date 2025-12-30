'use client';

import Link from 'next/link';
import {
  Calculator,
  Gavel,
  Shield,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const calculadoras = [
  {
    title: 'Dosimetria de Pena',
    description: 'Cálculo trifásico da pena conforme o Código Penal: pena-base, circunstâncias agravantes/atenuantes e causas de aumento/diminuição.',
    href: '/calculadoras/criminal/dosimetria',
    icon: Gavel,
    popular: true,
    fields: ['Pena base', 'Circunstâncias judiciais', 'Agravantes', 'Atenuantes', 'Majorantes', 'Minorantes'],
  },
  {
    title: 'Progressão de Regime',
    description: 'Cálculo da data para progressão de regime prisional considerando o tipo de crime, reincidência e tempo de pena cumprido.',
    href: '/calculadoras/criminal/progressao',
    icon: Shield,
    popular: true,
    fields: ['Pena total', 'Regime atual', 'Tipo de crime', 'Data início', 'Dias remidos'],
  },
  {
    title: 'Detração Penal',
    description: 'Cálculo do desconto de pena pelo tempo de prisão provisória cumprida antes do trânsito em julgado.',
    href: '/calculadoras/criminal/detracao',
    icon: Clock,
    fields: ['Pena total', 'Períodos prisão', 'Dias remidos', 'Data trânsito'],
  },
];

export default function CriminalCalculadorasPage() {
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
            <Gavel className="h-8 w-8 text-red-500" />
            Calculadoras Criminais
          </h1>
          <p className="text-muted-foreground mt-1">
            Cálculos de execução penal e dosimetria
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                    <calc.icon className="h-5 w-5 text-red-500" />
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
      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <Calculator className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold">Fundamentação Legal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os cálculos criminais seguem o Código Penal (arts. 59, 61-67, 68 - Dosimetria),
                Lei 7.210/84 (Lei de Execução Penal), Lei 13.964/2019 (Pacote Anticrime) e
                jurisprudência dos Tribunais Superiores. As frações de progressão são
                aplicadas conforme a natureza do crime e situação do apenado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
