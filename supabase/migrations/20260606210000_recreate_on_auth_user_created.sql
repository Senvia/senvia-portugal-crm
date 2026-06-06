-- Recria o trigger que cria o perfil automaticamente quando um utilizador novo
-- é criado (signup ou adicionado por um admin). A migração para o Supabase
-- próprio só trouxe o schema `public`, deixando de fora os triggers do schema
-- `auth` — por isso novos utilizadores ficavam SEM perfil ("Unknown").
-- A função public.handle_new_user() já existe; faltava apenas o trigger.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
