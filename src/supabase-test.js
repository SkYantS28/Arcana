
import { supabase } from './lib/supabase'

export async function testarConexao() {
  const { error } = await supabase
    .from('services')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erro ao conectar com Supabase:', error.message)
    return false
  }

  console.log('Conexão com Supabase funcionando!')
  return true
}
