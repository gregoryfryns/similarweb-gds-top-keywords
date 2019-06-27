// Type definitions for Similarweb API 2019-06-05
// Definitions by: Gregory Fryns <gregory.fryns@similarweb.com>

/* eslint-disable @typescript-eslint/camelcase */
export interface SimilarwebApiReply {
  meta: {
    request: {
      format: string;
      domain?: string;
      main_domain_only?: boolean;
      show_verified?: boolean;
      start_date?: string;
      end_date?: string;
      limit?: number;
      country?: string;
      store?: string;
      app_id?: string;
      category?: string;
      mode?: string;
      device?: string;
    };
    status: string;
    error_code?: number;
    error_message?: string;
    last_updated?: string;
  };
}

export interface CategoryCapabilities {
  snapshot_interval: {
    start_date: string;
    end_date: string;
  };
  countries: {
    code: string;
    name: string;
  }[];
}

export interface CapabilitiesReply extends SimilarwebApiReply {
  remaining_hits: number;
  web_desktop_data: CategoryCapabilities;
  web_mobile_data: CategoryCapabilities;
  app_data: CategoryCapabilities;
  app_engagement_data: CategoryCapabilities;
}

export interface VisitsReply extends SimilarwebApiReply {
  visits: {
    date: string;
    visits: number;
  }[];
}

export interface PagesPerVisitReply extends SimilarwebApiReply {
  pages_per_visit: {
    date: string;
    pages_per_visit: number;
  }[];
}

export interface BounceRateReply extends SimilarwebApiReply {
  bounce_rate: {
    date: string;
    bounce_rate: number;
  }[];
}

export interface AverageVisitDurationReply extends SimilarwebApiReply {
  average_visit_duration: {
    date: string;
    average_visit_duration: number;
  }[];
}

export interface DesktopMobileShareReply extends SimilarwebApiReply {
  desktop_visit_share: number;
  mobile_web_visit_share: number;
}

export interface UniqueVisitorsReply extends SimilarwebApiReply {
  unique_visitors: {
    date: string;
    unique_visitors: number;
  }[];
}

export interface TrafficSourcesReply extends SimilarwebApiReply {
  overview: {
    domain: string;
    source_type: string;
    share: number;
  }[];
}

export interface TrafficSourcesOverviewReply extends SimilarwebApiReply {
  visits: {
    [domain: string]: [{
      source_type: string;
      visits: [{
        date: string;
        organic: number;
        paid: number;
      }];
    }];
  };
}

export interface ReferralsReply extends SimilarwebApiReply {
  referrals: {
    share: number;
    domain: string;
    change: number;
  }[];
  visits: number;
  global_ranking: number;
  category: string;
  category_ranking: number;
}

export interface SocialReferralsReply extends SimilarwebApiReply {
  social: {
    page: string;
    share: number;
    change: number;
    children: string;
  }[];
  visits: number;
}

export interface AdNetworksReply extends SimilarwebApiReply {
  ad_networks: {
    ad_network: string;
    share: number;
    change: number;
  }[];
  global_ranking: number;
  category: string;
  category_ranking: string;
}

export interface PublishersReply extends SimilarwebApiReply {
  publishers: {
    domain: string;
    share: number;
    change: number;
  }[];
  visits: number;
  global_ranking: number;
  category: string;
  category_ranking: number;
}

export interface KeywordsReply extends SimilarwebApiReply {
  search: {
    search_term: string;
    share: number;
    visits: number;
    change: number;
    volume: number;
    cpc: number;
    url: string;
    position: number;
  }[];
  visits: number;
}

export interface KeywordCompetitorsReply extends SimilarwebApiReply {
  data: {
    url: string;
    score: number;
  }[];
  global_ranking: number;
  category: string;
  category_ranking: number;
}

export interface KeywordAnalysisReply extends SimilarwebApiReply {
  traffic_breakdown: {
    domain: string;
    traffic_share: number;
    position: number;
    destination_url: string;
    website_categories: string;
  }[];
  search_volume: {
    volume: number;
  };
  cost_per_click: {
    cpc: number;
  };
  organic_vs_paid: {
    organic: number;
    paid: number;
  };
}

export interface SimilarSitesReply extends SimilarwebApiReply {
  similar_sites: {
    url: string;
    score: number;
  }[];
  global_ranking: number;
  category: string;
  category_ranking: number;
}

export interface AudienceInterestsReply extends SimilarwebApiReply {
  records: {
    affinity: number;
    overlap: number;
    domain: string;
    has_adsense: boolean;
  }[];
  global_ranking: number;
  category: string;
  category_ranking: number;
}

export interface CategoryRankReply extends SimilarwebApiReply {
  category: string;
  rank: number;
}

export interface TopSitesReply extends SimilarwebApiReply {
  top_sites: {
    rank: number;
    domain: string;
  }[];
}

interface LiteSourceItem {
  site: string;
  value: number;
  change: number;
}
interface LiteKeywordItem {
  keyword: string;
  value: number;
  change: number;
}
interface SimilarSiteItem {
  site: string;
  screenshot: string;
  rank: number;
}

export interface ApiLiteReply {
  site_name: string;
  is_site_verified: boolean;
  category: string;
  laarge_screenshot: string;
  reach_months: number;
  data_months: number;
  global_rank: {
    rank: number;
    direction: number;
  };
  country_rank: {
    country: number;
    rank: number;
    direction: number;
  };
  category_rank: {
    category: string;
    rank: number;
    direction: number;
  };
  title: string;
  description: string;
  redirect_url: string;
  estimated_monthly_visits: {
    [date: string]: number;
  };
  engagements: {
    year: number;
    month: number;
    visits: number;
    time_on_site: number;
    page_per_visit: number;
    bounce_rate: number;
  };
  top_country_shares: {
    country: number;
    value: number;
    change: number;
  }[];
  total_countries: number;
  traffic_sources: {
    search: number;
    social: number;
    mail: number;
    'paid _referrals': number;
    direct: number;
    referrals: number;
  };
  referrals_ratio: number;
  top_referring: LiteSourceItem[];
  total_referring: number;
  top_destinations: LiteSourceItem[];
  total_destinations: number;
  search_ratio: number;
  top_organic_keywords: LiteKeywordItem[];
  top_paid_keywords: LiteKeywordItem[];
  organic_keywords_rolling_unique_count: number;
  paid_keywords_rolling_unique_count: number;
  organic_search_share: number;
  paid_search_share: number;
  social_ratio: number;
  top_social: {
    name: string;
    icon: string;
    site: string;
    value: number;
    change: number;
  }[];
  display_ads_ratio: number;
  top_publishers: LiteSourceItem[];
  top_ad_networks: LiteSourceItem[];
  incoming_ads_rolling_unique_count: number;
  top_categories_and_fills: any[];
  top_tags_and_strength: any[];
  top_also_visited: any[];
  also_visited_unique_count: number;
  similar_sites: SimilarSiteItem[];
  similar_sites_by_rank: SimilarSiteItem[];
  mobile_apps: {
    [appCode: string]: {
      key: string;
      app_id: string;
      title: string;
      cover: string;
      author: string;
      category: string;
      price: string;
      rating: number;
      rating_count: number;
      valid: boolean;
    };
  };
  daily_visits_min_date: string;
  daily_visits_max_date: string;
}

interface DateValueItem {
  date: string;
  value: number;
}

export interface LeadEnrichmentReply extends SimilarwebApiReply {
  global_rank: number;
  employee_range: string;
  headquarters: string;
  website_category: string;
  category_rank: number;
  visits: DateValueItem[];
  mom_growth: DateValueItem[];
  unique_visitors: DateValueItem[];
  pages_per_visit: DateValueItem[];
  bounce_rate: DateValueItem[];
  average_visit_duration: DateValueItem[];
  mobile_desktop_share: {
    date: string;
    value: {
      desktop_share: number;
      mobile_share: number;
    };
  }[];
  traffic_sources: {
    date: string;
    value: {
      source_type: string;
      share: number;
    }[];
  }[];
  geography_share: {
    date: string;
    value: {
      country: number;
      share: number;
    }[];
  }[];
}

export interface PopularPagesReply extends SimilarwebApiReply {
  popular_pages: {
    page: string;
    share: number;
    change: number;
  }[];
}

export interface LeadingFoldersReply extends SimilarwebApiReply {
  leading_folders: {
    folder: string;
    share: number;
    change: number;
  };
}

export interface SubdomainsReply extends SimilarwebApiReply {
  subdomains: {
    subdomain: string;
    share: number;
  }[];
}

export interface DemographicsAgeReply extends SimilarwebApiReply {
  age_18_to_24: number;
  age_25_to_34: number;
  age_35_to_44: number;
  age_45_to_54: number;
  age_55_to_64: number;
  age_65_plus: number;
}

export interface DemographicsGenderReply extends SimilarwebApiReply {
  male: number;
  female: number;
}

export interface AppDetailsReply extends SimilarwebApiReply {
  title: string;
  cover: string;
  author: string;
  price: string;
  main_category: string;
  main_category_id: string;
  rating: number;
  release_date: string;
  in_app_purchase: boolean;
}

export interface SiteRelatedAppsReply extends SimilarwebApiReply {
  related_apps: {
    app_id: string;
    title: string;
  }[];
}

export interface AppRankReply extends SimilarwebApiReply {
  ranks: {
    key: string;
    value: number;
  }[];
}

export interface RelatedSitesReply extends SimilarwebApiReply {
  related_sites: string[];
}

export interface TopAppsReply extends SimilarwebApiReply {
  top_apps: {
    app: string;
    title: string;
    publisher: string;
    category: string;
    rank: number;
    change: number;
  }[];
}

export interface AppInstallPenetrationReply extends SimilarwebApiReply {
  current_installs: {
    start_date: string;
    end_date: string;
    installs: number;
  }[];
}

export interface AppDailyActiveUsersReply extends SimilarwebApiReply {
  daily_active_users: {
    start_date: string;
    end_date: string;
    active_users: number;
  }[];
}

export interface AppMonthlyActiveUsersReply extends SimilarwebApiReply {
  monthly_active_users: {
    start_date: string;
    end_date: string;
    active_users: number;
  }[];
}

export interface AppSessionsPerUserReply extends SimilarwebApiReply {
  sessions_per_user: {
    start_date: string;
    end_date: string;
    sessions_per_user: string;
  }[];
}

export interface AppUsageTimePerSessionReply extends SimilarwebApiReply {
  usage_time_per_session: {
    start_date: string;
    end_date: string;
    usage_time_per_session: string;
  }[];
}

export interface AppAudienceInterestsReply extends SimilarwebApiReply {
  also_used_apps: {
    application: string;
    affinity: number;
  }[];
}

export interface AppRetentionReply extends SimilarwebApiReply {
  retention_list: {
    days_since_install: number;
    retention: number;
  }[];
  loyal_vs_early_churn: {
    early_churn_share: number;
    early_churn_median_lifetime: number;
    loyal_share: number;
    loyal_median_lifetime: number;
  };
}

export interface AppDownloadsReply extends SimilarwebApiReply {
  downloads: {
    start_date: string;
    end_date: string;
    downloads: number;
  }[];
}

export interface AppDemographicsAgeReply extends SimilarwebApiReply {
  age_18_to_24: number;
  age_25_to_34: number;
  age_35_to_44: number;
  age_45_to_54: number;
  age_55_plus: number;
}

export interface AppDemographicsGenderReply extends SimilarwebApiReply {
  male: number;
  female: number;
}
