'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Calculator,
  Users,
  Briefcase,
  FileText,
  Calendar,
  DollarSign,
  Settings,
  Home,
  Scale,
  ChevronDown,
  ChevronRight,
  Gavel,
  Heart,
  Shield,
  Building,
  Menu,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Calculadoras',
    icon: Calculator,
    children: [
      { title: 'Todas', href: '/calculadoras' },
      { title: 'Trabalhista', href: '/calculadoras/trabalhista' },
      { title: 'Previdenciário', href: '/calculadoras/previdenciario' },
      { title: 'Família', href: '/calculadoras/familia' },
      { title: 'Criminal', href: '/calculadoras/criminal' },
      { title: 'Cível', href: '/calculadoras/civel' },
    ],
  },
  {
    title: 'Processos',
    href: '/processos',
    icon: Briefcase,
  },
  {
    title: 'Clientes',
    href: '/clientes',
    icon: Users,
  },
  {
    title: 'Documentos',
    href: '/documentos',
    icon: FileText,
  },
  {
    title: 'Agenda',
    href: '/agenda',
    icon: Calendar,
  },
  {
    title: 'Financeiro',
    href: '/financeiro',
    icon: DollarSign,
  },
  {
    title: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
  },
];

const calculadorasByArea: Record<string, { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  trabalhista: [
    { title: 'FGTS', href: '/calculadoras/trabalhista/fgts', icon: Building },
    { title: 'Verbas Rescisórias', href: '/calculadoras/trabalhista/verbas-rescisorias', icon: FileText },
    { title: 'Horas Extras', href: '/calculadoras/trabalhista/horas-extras', icon: Calculator },
    { title: 'Adicional Noturno', href: '/calculadoras/trabalhista/adicional-noturno', icon: Calculator },
    { title: 'Férias', href: '/calculadoras/trabalhista/ferias', icon: Calendar },
    { title: '13º Salário', href: '/calculadoras/trabalhista/decimo-terceiro', icon: DollarSign },
  ],
  previdenciario: [
    { title: 'INSS', href: '/calculadoras/previdenciario/inss', icon: Shield },
    { title: 'Aposentadoria', href: '/calculadoras/previdenciario/aposentadoria', icon: Users },
    { title: 'RMI', href: '/calculadoras/previdenciario/rmi', icon: Calculator },
  ],
  familia: [
    { title: 'Pensão Alimentícia', href: '/calculadoras/familia/pensao', icon: Heart },
    { title: 'Divórcio', href: '/calculadoras/familia/divorcio', icon: Scale },
  ],
  criminal: [
    { title: 'Dosimetria', href: '/calculadoras/criminal/dosimetria', icon: Gavel },
    { title: 'Progressão de Regime', href: '/calculadoras/criminal/progressao', icon: Shield },
    { title: 'Detração Penal', href: '/calculadoras/criminal/detracao', icon: Calculator },
  ],
  civel: [
    { title: 'Correção Monetária', href: '/calculadoras/civel/correcao-monetaria', icon: DollarSign },
    { title: 'Juros Moratórios', href: '/calculadoras/civel/juros', icon: Calculator },
    { title: 'Liquidação', href: '/calculadoras/civel/liquidacao', icon: FileText },
  ],
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<string[]>(['Calculadoras']);

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className={cn('flex h-full flex-col border-r bg-background', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">LexEngine</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.children) {
              const isOpen = openItems.includes(item.title);
              const hasActiveChild = item.children.some((child) => isActive(child.href));

              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={() => toggleItem(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-between',
                        hasActiveChild && 'bg-accent'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Button
                        key={child.href}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'w-full justify-start',
                          isActive(child.href) && 'bg-accent font-medium'
                        )}
                        asChild
                      >
                        <Link href={child.href}>{child.title}</Link>
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <Button
                key={item.title}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2',
                  item.href && isActive(item.href) && 'bg-accent font-medium'
                )}
                asChild
              >
                <Link href={item.href!}>
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Usuário</p>
            <p className="text-xs text-muted-foreground truncate">usuario@email.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-background shadow-lg">
            <div className="absolute right-2 top-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}

export { calculadorasByArea };
