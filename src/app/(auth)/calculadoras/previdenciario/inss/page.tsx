'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Download, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { trpc } from '@/lib/trpc/client';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  salarioBruto: z.string().min(1, 'Informe o salário bruto'),
  tipoContribuinte: z.enum(['empregado', 'domestico', 'contribuinte_individual', 'facultativo', 'mei', 'segurado_especial']),
  planoContribuicao: z.enum(['normal', 'simplificado', 'baixa_renda']).optional(),
  competencia: z.date({ message: 'Selecione a competência' }),
  incluirPatronal: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const TIPOS_CONTRIBUINTE = [
  { value: 'empregado', label: 'Empregado CLT' },
  { value: 'domestico', label: 'Empregado Doméstico' },
  { value: 'contribuinte_individual', label: 'Contribuinte Individual' },
  { value: 'facultativo', label: 'Facultativo' },
  { value: 'mei', label: 'MEI' },
  { value: 'segurado_especial', label: 'Segurado Especial' },
];

const PLANOS_CONTRIBUICAO = [
  { value: 'normal', label: 'Normal (20%)', description: 'Direito a todos os benefícios' },
  { value: 'simplificado', label: 'Simplificado (11%)', description: 'Aposentadoria por idade apenas' },
  { value: 'baixa_renda', label: 'Baixa Renda (5%)', description: 'Dona de casa baixa renda' },
];

export default function INSSCalculatorPage() {
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salarioBruto: '',
      tipoContribuinte: 'empregado',
      planoContribuicao: 'normal',
      incluirPatronal: false,
    },
  });

  const tipoContribuinte = form.watch('tipoContribuinte');
  const showPlanoContribuicao = tipoContribuinte === 'contribuinte_individual' || tipoContribuinte === 'facultativo';
  const showPatronal = tipoContribuinte === 'domestico';

  const calculateMutation = trpc.calculadoras.inss.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success('Cálculo realizado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    calculateMutation.mutate({
      salarioBruto: parseFloat(data.salarioBruto.replace(/\./g, '').replace(',', '.')),
      tipoContribuinte: data.tipoContribuinte,
      planoContribuicao: data.planoContribuicao,
      competencia: data.competencia,
      incluirPatronal: data.incluirPatronal,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-green-500" />
          Calculadora INSS
        </h1>
        <p className="text-muted-foreground mt-2">
          Calcule a contribuição previdenciária com alíquotas progressivas (EC 103/2019)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Dados do Cálculo
            </CardTitle>
            <CardDescription>
              Informe os dados para calcular a contribuição do INSS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="salarioBruto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salário/Remuneração Bruta (R$)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="5.000,00"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            const formatted = (parseInt(value) / 100).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });
                            field.onChange(formatted === 'NaN' ? '' : formatted);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Valor bruto da remuneração mensal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoContribuinte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Contribuinte</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_CONTRIBUINTE.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Categoria do segurado na Previdência Social
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showPlanoContribuicao && (
                  <FormField
                    control={form.control}
                    name="planoContribuicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plano de Contribuição</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PLANOS_CONTRIBUICAO.map((plano) => (
                              <SelectItem key={plano.value} value={plano.value}>
                                <div>
                                  <div>{plano.label}</div>
                                  <div className="text-xs text-muted-foreground">{plano.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Escolha o plano conforme seus objetivos previdenciários
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="competencia"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Competência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'MMMM/yyyy', { locale: ptBR })
                              ) : (
                                <span>Selecione...</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('2019-11-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Mês de referência para o cálculo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showPatronal && (
                  <FormField
                    control={form.control}
                    name="incluirPatronal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Incluir Contribuição Patronal
                          </FormLabel>
                          <FormDescription>
                            Adicionar 8% de contribuição do empregador
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={calculateMutation.isPending}
                >
                  {calculateMutation.isPending ? (
                    <>Calculando...</>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular INSS
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resultado do Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Contribuição Segurado</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(result.contribuicaoSegurado)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Alíquota Efetiva</p>
                        <p className="text-2xl font-bold">
                          {formatPercentage(result.aliquotaEfetiva)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Base de Cálculo</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.baseCalculo)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Salário de Contribuição</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.salarioContribuicao)}
                        </p>
                      </div>
                    </div>
                    {result.contribuicaoPatronal > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <p className="text-sm text-blue-700">Contribuição Patronal</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {formatCurrency(result.contribuicaoPatronal)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm text-amber-700">Total Contribuições</p>
                          <p className="text-2xl font-bold text-amber-700">
                            {formatCurrency(result.totalContribuicao)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm text-gray-600">Teto do INSS (2024)</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {formatCurrency(result.tetoINSS)}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="mr-2 h-4 w-4" />
                      Salvar Cálculo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown by brackets */}
              {result.faixasAplicadas && result.faixasAplicadas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento por Faixas</CardTitle>
                    <CardDescription>
                      Cálculo progressivo conforme tabela do INSS
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Faixa</TableHead>
                            <TableHead className="text-right">Base de Cálculo</TableHead>
                            <TableHead className="text-right">Alíquota</TableHead>
                            <TableHead className="text-right">Contribuição</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.faixasAplicadas.map((faixa: any) => (
                            <TableRow key={faixa.faixa}>
                              <TableCell className="font-medium">{faixa.faixa}ª Faixa</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(faixa.baseCalculo)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercentage(faixa.aliquota)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(faixa.contribuicao)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={3} className="font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(result.contribuicaoSegurado)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!result && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum cálculo realizado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha o formulário e clique em calcular para ver os resultados
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Legal Notes */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Fundamentação Legal</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          {result ? (
            <p>{result.fundamentacao}</p>
          ) : (
            <>
              <p>
                O cálculo é realizado conforme a <strong>EC 103/2019</strong> (Reforma da Previdência)
                e <strong>Lei 8.212/91</strong>.
              </p>
              <ul>
                <li>
                  <strong>Empregados CLT:</strong> Alíquotas progressivas de 7,5% a 14%
                  sobre o salário de contribuição.
                </li>
                <li>
                  <strong>Contribuinte Individual/Facultativo:</strong> 20% (plano normal),
                  11% (simplificado) ou 5% (baixa renda).
                </li>
                <li>
                  <strong>MEI:</strong> 5% do salário mínimo.
                </li>
              </ul>
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Tabela INSS 2024</h4>
                <ul className="text-green-700 text-sm">
                  <li>Até R$ 1.412,00 → 7,5%</li>
                  <li>De R$ 1.412,01 a R$ 2.666,68 → 9%</li>
                  <li>De R$ 2.666,69 a R$ 4.000,03 → 12%</li>
                  <li>De R$ 4.000,04 a R$ 7.786,02 → 14%</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
