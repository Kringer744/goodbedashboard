/**
 * Meta Marketing API Service
 * Used to fetch campaign data and insights
 */

const META_BASE_URL = 'https://graph.facebook.com/v19.0';
const META_ACCESS_TOKEN = 'EAAW8IvhukPIBRMyg0AhOMq6AUIcQWoZA9e7DIzisuutZADglU75xJC6l7M7c14mfODfHUZAyAZAOELSAO9Az9d4xCODLg7WtsdTlSXHNVIjloxwYM2nEO6YoAKF04YqPZCKbsjm627HfmRdZAmAUBqF2U5v7iZBWEvzcrWsGgRzFktEb0D2rjXgfBXWSZCqm';

export interface AdAccount {
  id: string;
  name: string;
  account_id: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  insights?: CampaignInsights;
}

export interface CampaignInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  cpc: number;
  ctr: number;
  cpp: number;
  conversions?: { action_type: string; value: string }[];
}

/**
 * Fetch all ad accounts associated with the token
 */
export async function fetchAdAccounts(): Promise<AdAccount[]> {
  try {
    const response = await fetch(`${META_BASE_URL}/me/adaccounts?fields=name,account_id&access_token=${META_ACCESS_TOKEN}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Meta API Error: ${response.status}`);
    }
    const data = await response.json();
    const accounts = (data.data || []).filter((acc: AdAccount) => 
      acc.name.toLowerCase().includes('goodbe')
    );
    return accounts;
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    throw error;
  }
}

/**
 * Fetch campaigns for a specific ad account
 */
export async function fetchCampaigns(adAccountId: string, dateFrom?: string, dateTo?: string): Promise<MetaCampaign[]> {
  try {
    const fields = 'name,status,objective';
    const response = await fetch(`${META_BASE_URL}/${adAccountId}/campaigns?fields=${fields}&access_token=${META_ACCESS_TOKEN}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Meta API Error: ${response.status}`);
    }

    const data = await response.json();
    const campaigns: MetaCampaign[] = data.data || [];

    const insights = await fetchCampaignsInsights(adAccountId, dateFrom, dateTo);

    return campaigns.map(campaign => {
      const raw = insights.find(i => i.campaign_id === campaign.id);
      if (!raw) return campaign;
      const leadActions = (raw.actions || []).filter(
        (a: any) =>
          a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
          a.action_type === 'onsite_conversion.messaging_conversation_started_30d' ||
          a.action_type === 'messaging_conversation_started'
      );
      const leads = leadActions.reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);
      return { ...campaign, insights: { ...raw, leads } };
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

/**
 * Fetch insights for all campaigns in an ad account for the last 30 days
 */
async function fetchCampaignsInsights(adAccountId: string, dateFrom?: string, dateTo?: string): Promise<any[]> {
  const fields = 'campaign_id,campaign_name,spend,impressions,reach,clicks,cpc,ctr,actions';
  const dateParam = dateFrom && dateTo
    ? `&time_range=${encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))}`
    : '&date_preset=last_30d';
  const response = await fetch(
    `${META_BASE_URL}/${adAccountId}/insights?level=campaign&fields=${fields}${dateParam}&access_token=${META_ACCESS_TOKEN}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.warn('Could not fetch campaign insights:', error);
    return [];
  }
  
  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch total spend for the last 30 days to use in financial KPIs
 */
export async function fetchTotalAdSpend(adAccountId: string): Promise<number> {
  try {
    const response = await fetch(
      `${META_BASE_URL}/${adAccountId}/insights?fields=spend&date_preset=last_30d&access_token=${META_ACCESS_TOKEN}`
    );
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    const totalSpend = data.data?.reduce((sum: number, item: any) => sum + parseFloat(item.spend || 0), 0) || 0;
    
    return totalSpend;
  } catch (error) {
    console.error('Error fetching total ad spend:', error);
    return 0;
  }
}
