import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GIPHY_API_KEY, GIPHY_API_URL } from "@/constants/giphyConstants";
import { useDebounce } from "@/hooks/useDebounce";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type GifResult = {
  id: string;
  url: string;
  title: string;
};

const DEBOUNCE_DELAY = 300; // milliseconds
const RESULTS_PER_PAGE = 12;

function getQueryParam(param: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function updateURLParams(params: { [key: string]: string | number }) {
  const url = new URL(window.location.href);
  Object.keys(params).forEach((key) => {
    url.searchParams.set(key, String(params[key]));
  });
  window.history.pushState({}, "", url);
}

export default function GifSearch() {
  const [searchTerm, setSearchTerm] = useState(() => getQueryParam("q") || "");
  const [results, setResults] = useState<GifResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() =>
    parseInt(getQueryParam("page") || "1", 10)
  );
  const [hasMore, setHasMore] = useState(false);

  const searchGifs = useCallback(async (term: string, pageValue: number) => {
    if (!term.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const offsetValue = (pageValue - 1) * RESULTS_PER_PAGE; // Calculate offset based on page number

    try {
      const response = await fetch(
        `${GIPHY_API_URL}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(
          term
        )}&limit=${RESULTS_PER_PAGE}&offset=${offsetValue}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch GIFs");
      }

      const data = await response.json();
      const giphyResults: GifResult[] = data.data.map((item: any) => ({
        id: item.id,
        url: item.images.fixed_height.url,
        title: item.title,
      }));

      setResults((prev) =>
        pageValue === 1 ? giphyResults : [...prev, ...giphyResults]
      );
      setHasMore(data.pagination.total_count > offsetValue + RESULTS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching GIFs:", err);
      setError("Failed to fetch GIFs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useDebounce(
    (term: string) => searchGifs(term, 1),
    DEBOUNCE_DELAY
  );

  // Trigger search when searchTerm changes and update URL
  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
      // if (page === 1) updateURLParams({ q: searchTerm, page: 1 });
    }
  }, [searchTerm]);

  // Trigger page change when loadMore is clicked and update URL
  const loadMore = () => {
    const newPage = page + 1;
    setPage(newPage);
    searchGifs(searchTerm, newPage);
    updateURLParams({ q: searchTerm, page: newPage });
  };

  // Fetch initial search term and page from URL parameters
  useEffect(() => {
    const querySearchTerm = getQueryParam("q") || "";
    const queryPage = parseInt(getQueryParam("page") || "1", 10);

    if (querySearchTerm) {
      setSearchTerm(querySearchTerm);
      setPage(queryPage);
      searchGifs(querySearchTerm, queryPage);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">GIF Search</h1>
      <div className="mb-4 relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for GIFs..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            updateURLParams({ q: e.target.value, page: 1 });
          }}
          className="w-full rounded-lg bg-background pl-8"
        />
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((gif) => (
          <div key={gif.id} className="aspect-square relative group">
            <img
              src={gif.url}
              alt={gif.title}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2 rounded-lg">
              <p className="text-white text-sm truncate w-full">{gif.title}</p>
            </div>
          </div>
        ))}
        {isLoading &&
          Array(RESULTS_PER_PAGE)
            .fill(0)
            .map((_, index) => (
              <Skeleton
                key={`skeleton-${index}`}
                className="aspect-square rounded-lg"
              />
            ))}
      </div>
      {hasMore && (
        <div className="mt-6 text-center">
          <Button onClick={loadMore} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
