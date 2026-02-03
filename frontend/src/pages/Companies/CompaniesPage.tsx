import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { BackButton } from '../../components/common/BackButton';
import { companiesApi } from '../../features/companies/api/companiesApi';
import type { Company, CompanySize } from '../../types/company';
import styles from './CompaniesPage.module.css';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'E-commerce',
  'Manufacturing',
  'Consulting',
  'Other',
];

const SIZE_LABELS: Record<CompanySize, string> = {
  startup: '1-10 employees',
  small: '11-50 employees',
  medium: '51-200 employees',
  large: '201-1000 employees',
  enterprise: '1000+ employees',
};

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await companiesApi.getCompanies({
        page,
        limit: 12,
        industry: selectedIndustry || undefined,
        search: searchQuery || undefined,
        verified_only: verifiedOnly || undefined,
      });
      setCompanies(response.companies);
      setTotalPages(response.pages);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedIndustry, searchQuery, verifiedOnly]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCompanies();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedIndustry('');
    setVerifiedOnly(false);
    setPage(1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.backNav}>
        <BackButton fallbackPath="/events" />
      </div>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Companies</h1>
          <p>Discover innovative companies and explore their challenges</p>
        </div>
        <Link to="/companies/create">
          <Button>Create Company</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies..."
            className={styles.searchInput}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className={styles.filterGroup}>
          <select
            value={selectedIndustry}
            onChange={(e) => {
              setSelectedIndustry(e.target.value);
              setPage(1);
            }}
            className={styles.select}
          >
            <option value="">All Industries</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => {
                setVerifiedOnly(e.target.checked);
                setPage(1);
              }}
            />
            Verified only
          </label>

          {(searchQuery || selectedIndustry || verifiedOnly) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className={styles.clearButton}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className={styles.loading}>Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No companies found</h3>
          <p>Try adjusting your filters or search query</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {companies.map((company) => (
              <Link
                key={company.id}
                to={`/companies/${company.id}`}
                className={styles.companyCard}
              >
                <div className={styles.cardHeader}>
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className={styles.logo}
                    />
                  ) : (
                    <div className={styles.logoPlaceholder}>
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {company.is_verified && (
                    <span className={styles.verifiedBadge} title="Verified Company">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 00-1.06-1.06L6.75 8.19 5.28 6.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z" />
                      </svg>
                    </span>
                  )}
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.companyName}>{company.name}</h3>
                  {company.description && (
                    <p className={styles.description}>{company.description}</p>
                  )}
                  <div className={styles.meta}>
                    {company.industry && (
                      <Badge variant="default" size="small">
                        {company.industry}
                      </Badge>
                    )}
                    {company.size && (
                      <span className={styles.size}>{SIZE_LABELS[company.size]}</span>
                    )}
                  </div>
                  {company.location && (
                    <p className={styles.location}>{company.location}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompaniesPage;
