import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@repo/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: { txId: string } }
) {
  console.log('[API /files] GET request for transaction:', params.txId);
  
  try {
    const supabase = await createClient();
    console.log('[API /files] Created Supabase client');
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[API /files] Auth check:', { userId: user?.id, authError });
    
    if (authError || !user) {
      console.log('[API /files] Not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get files for this transaction
    console.log('[API /files] Fetching files from transaction_files table');
    const { data: files, error: filesError } = await supabase
      .from('transaction_files')
      .select('*')
      .eq('tx_id', params.txId)
      .order('created_at', { ascending: false });

    console.log('[API /files] Query result:', { 
      filesCount: files?.length, 
      filesError,
      firstFile: files?.[0]?.id
    });

    if (filesError) {
      console.error('[API /files] Error fetching files:', filesError);
      return NextResponse.json({ error: filesError.message }, { status: 500 });
    }

    console.log('[API /files] Returning', files?.length || 0, 'files');
    return NextResponse.json({ data: files || [], error: null });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}