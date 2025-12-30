'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Download, FileText } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  saldoInicial: z.string().min(1, 'Informe o saldo inicial'),
  dataInicio: z.date({ error: 'Selecione a data de início' }),
  dataFim: z.date({ error: 'Selecione a data de fim' }),
  depositosMensais: z.string().optional(),
  tipoCorrecao: z.enum(['TR', 'TR_SELIC']),
});

type FormData = z.infer<typeof formSchema>;

export default function FGTSCalculatorPage() {
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      saldoInicial: '',
      depositosMensais: '',
      tipoCorrecao: 'TR',
    },
  });

  const calculateMutation = trpc.calculadoras.fgts.useMutation({
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
      saldoInicial: parseFloat(data.saldoInicial.replace(/\./g, '').replace(',', '.')),
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      depositosMensais: data.depositosMensais
        ? parseFloat(data.depositosMensais.replace(/\./g, '').replace(',', '.'))
        : undefined,
      tipoCorrecao: data.tipoCorrecao,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Calculadora FGTS</h1>
        <p className="text-muted-foreground mt-2">
          Calcule a correção do saldo do FGTS com TR e juros de 3% a.a.
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
              Informe os dados para calcular a correção do FGTS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="saldoInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo Inicial (R$)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10.000,00"
                          {...field}
                          onChange={(e) => {
                            // Format as currency while typing
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
                        Saldo do FGTS na data de início
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dataInicio"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Início</FormLabel>
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
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
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
                                date > new Date() || date < new Date('1990-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataFim"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Fim</FormLabel>
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
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
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
                                date > new Date() || date < new Date('1990-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="depositosMensais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depósitos Mensais (R$) - Opcional</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="500,00"
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
                        Valor dos depósitos mensais (se houver)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoCorrecao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Correção</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TR">TR (Taxa Referencial)</SelectItem>
                          <SelectItem value="TR_SELIC">TR + SELIC (Revisão)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        TR + SELIC para cálculo de diferenças em ações revisionais
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                      Calcular FGTS
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
                        <p className="text-sm text-muted-foreground">Saldo Final</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(result.saldoFinal)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Correção (TR)</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.correcaoMonetaria)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Juros (3% a.a.)</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.juros)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Total Depósitos</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.totalDepositos)}
                        </p>
                      </div>
                    </div>
                    {result.diferencaDevida > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm text-amber-700">Diferença Devida (TR+SELIC)</p>
                        <p className="text-2xl font-bold text-amber-700">
                          {formatCurrency(result.diferencaDevida)}
                        </p>
                      </div>
                    )}
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

              {/* Memory of Calculation */}
              <Card>
                <CardHeader>
                  <CardTitle>Memória de Cálculo</CardTitle>
                  <CardDescription>
                    Detalhamento mês a mês da correção
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">Saldo Inicial</TableHead>
                          <TableHead className="text-right">Depósito</TableHead>
                          <TableHead className="text-right">TR</TableHead>
                          <TableHead className="text-right">Correção</TableHead>
                          <TableHead className="text-right">Juros</TableHead>
                          <TableHead className="text-right">Saldo Final</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.breakdown.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.periodo}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.saldoInicial)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.deposito)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercentage(item.trAplicada * 100, 4)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.correcaoTR)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.juros)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.saldoFinal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
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
          <p>
            O cálculo é realizado conforme a <strong>Lei 8.036/90</strong>, que dispõe sobre o
            Fundo de Garantia do Tempo de Serviço (FGTS).
          </p>
          <ul>
            <li>
              <strong>Correção Monetária:</strong> Aplicada mensalmente pela Taxa Referencial (TR),
              conforme publicação do Banco Central do Brasil.
            </li>
            <li>
              <strong>Juros:</strong> 3% ao ano, capitalizados mensalmente (0,25% a.m.), conforme
              art. 13 da Lei 8.036/90.
            </li>
          </ul>
          <p className="text-muted-foreground">
            Nota: O cálculo com TR+SELIC é utilizado em ações revisionais do FGTS, considerando
            a diferença entre a correção efetivamente aplicada (TR) e a que deveria ter sido
            aplicada (SELIC ou outro índice).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
