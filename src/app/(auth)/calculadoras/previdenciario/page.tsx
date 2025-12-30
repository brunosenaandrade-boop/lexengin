'use client';

import Link from 'next/link';
import {
  Calculator,
  Shield,
  Users,
  FileText,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const calculadoras = [
  {
    title: 'INSS',
    description: 'Cálculo da contribuição previdenciária mensal com as alíquotas progressivas após a Reforma da Previdência (EC 103/2019).',
    href: '/calculadoras/previdenciario/inss',
    icon: Shield,
    popular: true,
    fields: ['Salário bruto', 'Categoria', 'Outras receitas'],
  },
  {
    title: 'Aposentadoria',
    description: 'Simulação de elegibilidade e valor do benefício considerando todas as regras de transição da EC 103/2019.',
    href: '/calculadoras/previdenciario/aposentadoria',
    icon: Users,
    popular: true,
    fields: ['Data nascimento', 'Tempo contribuição', 'Média salarial', 'Tipo'],
  },
  {
    title: 'RMI - Renda Mensal Inicial',
    description: 'Cálculo da Renda Mensal Inicial do benefício previdenciário com base na média dos salários de contribuição.',
    href: '/calculadoras/previdenciario/rmi',
    icon: Calculator,
    fields: ['Salários de contribuição', 'Tipo de benefício', 'Data início'],
  },
  {
    title: 'Revisão da Vida Toda',
    description: 'Recálculo do benefício incluindo as contribuições anteriores a julho de 1994 (pré-Plano Real).',
    href: '/calculadoras/previdenciario/revisao-vida-toda',
    icon: FileText,
    fields: ['Contribuições pré-1994', 'Contribuições pós-1994', 'DIB'],
  },
];

export default function PrevidenciarioCalculadorasPage() {
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
            <Shield className="h-8 w-8 text-green-500" />
            Calculadoras Previdenciárias
          </h1>
          <p className="text-muted-foreground mt-1">
            Cálculos de benefícios e contribuições do INSS
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <calc.icon className="h-5 w-5 text-green-500" />
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
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Calculator className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">Fundamentação Legal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os cálculos previdenciários seguem a EC 103/2019 (Reforma da Previdência),
                Lei 8.213/91 (Planos de Benefícios), Lei 8.212/91 (Custeio) e demais
                normas aplicáveis. As alíquotas e tetos são atualizados conforme
                portarias do INSS.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
