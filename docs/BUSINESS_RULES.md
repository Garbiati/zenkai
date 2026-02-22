# Regras de Negocio

## Task Lifecycle

- backlog -> active -> done
- Undo: done -> backlog (limitado a 3x por task)
- Nao e possivel editar tasks concluidas

## Restricoes de Ativacao

- Max 1 card ativo por membro
- **v1.0:** Apenas VOCE pode ativar seu proprio card (admin e excecao)
- Block requer motivo obrigatorio
- Reativacao de task bloqueada requer nota de resolucao

## Time Tracking

- Auto-start ao ativar task (nova TimeEntry)
- Auto-close ao bloquear, concluir, pausar, trocar dono, ou deletar
- Apenas 1 timeEntry aberta por task (pausado = 0 abertas)
- Heartbeat a cada 60s; timeout de 2min -> auto-pause
- Calculo de horas hoje: entries clampeadas ao inicio do dia (GREATEST)

## Estimativa e Previsao (v1.0)

- Campo opcional `estimatedHours` por task (0.5 - 999h)
- Previsao de conclusao = horasRestantes / velocidadeMedia (h/dia util)
- Velocidade media = totalHorasGastas / diasUteisComEntries
- Se actual > estimated -> badge "Prazo excedido"

## Soft Delete e Auditoria

- Todas as operacoes sao soft delete + audit log
- Audit log registra: entityType, entityId, action, oldData, newData, performedBy, performedAt

## Senha

- Minimo 8 caracteres, 1 maiuscula, 1 numero
- Todos os membros pre-seed devem trocar senha no primeiro login

## Membros Pre-Seed

- 7 membros: a.garbiati (admin), p.perondini, s.ferreira, a.figueiredo, l.reis, r.casado, f.junior
- Senha inicial: backend123

## Work Schedule

- Escala global padrao: 08:00-12:00, 13:00-17:00 (8h/dia)
- Cada membro pode ter escala personalizada que sobrescreve a global
