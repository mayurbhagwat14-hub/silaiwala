import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, FileText, Clock, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';
import BottomNav from '../components/BottomNav';
import { sanitizeCmsHtml } from '../../../utils/formatHtml';
import useBrandingStore from '../../../store/brandingStore';

const NO_NAV_SLUGS = ['privacy-policy', 'terms-of-service', 'terms-and-conditions'];

/**
 * Renders an admin-managed CMS page (About Us, Contact Us, Shipping Policy, ...).
 * `slug` may be passed as a prop (from the shared legal route) or read from the URL.
 */
const CMSContentPage = ({ slug: slugProp, showBottomNav = true }) => {
    const { slug: slugParam } = useParams();
    const slug = slugProp || slugParam;
    const navigate = useNavigate();
    const { appName, supportEmail } = useBrandingStore();
    const [content, setContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const res = await api.get(`/cms/content/${slug}`);
                setContent(res.data?.success ? res.data.data : null);
            } catch (error) {
                console.error('Error fetching CMS content:', error);
                setContent(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [slug]);

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: content?.title, url: window.location.href }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied');
        }
    };

    const withNav = showBottomNav && !NO_NAV_SLUGS.includes(slug);
    const updated = content?.updatedAt
        ? new Date(content.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <div className={`min-h-screen bg-[#F7F5FA] font-sans text-gray-900 ${withNav ? 'pb-28' : 'pb-10'}`}>
            {/* Header bar */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate text-[16px] font-bold text-gray-900">
                        {content?.title || (isLoading ? '' : 'Page')}
                    </h1>
                    {content && (
                        <button
                            onClick={handleShare}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100"
                            aria-label="Share"
                        >
                            <Share2 size={18} />
                        </button>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-5">
                {isLoading ? (
                    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6">
                        <div className="h-6 w-2/3 animate-pulse rounded bg-gray-100" />
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-3.5 animate-pulse rounded bg-gray-100" style={{ width: `${95 - i * 7}%` }} />
                        ))}
                    </div>
                ) : !content ? (
                    <div className="rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#843D9B]/10 text-[#843D9B]">
                            <FileText size={24} />
                        </div>
                        <h2 className="text-base font-bold text-gray-900">Page not available</h2>
                        <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">This page hasn't been published yet. Please check back later.</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-6 rounded-xl bg-[#843D9B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f3284]"
                        >
                            Go Back
                        </button>
                    </div>
                ) : (
                    <>
                        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
                            <div className="mb-5 border-b border-gray-100 pb-5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#843D9B]">{appName || 'Sewzella'}</p>
                                <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{content.title}</h2>
                                {updated && (
                                    <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                                        <Clock size={12} /> Last updated {updated}
                                    </p>
                                )}
                            </div>
                            <div
                                className="cms-content-render break-words text-[14px] leading-[1.75] text-gray-700 [overflow-wrap:anywhere] sm:text-[15px]"
                                dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.content) }}
                            />
                        </article>

                        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:flex-row">
                            <p className="text-sm text-gray-600">Still have questions?</p>
                            <div className="flex w-full gap-2 sm:w-auto">
                                <button
                                    onClick={() => navigate('/user/support')}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#843D9B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#6f3284] sm:flex-none"
                                >
                                    <MessageCircle size={14} /> Help Center
                                </button>
                                <a
                                    href={`mailto:${supportEmail || 'support@sewzella.com'}`}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:flex-none"
                                >
                                    <Mail size={14} /> Email Us
                                </a>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {withNav && <BottomNav />}

            <style dangerouslySetInnerHTML={{
                __html: `
                .cms-content-render h1 { font-size: 1.3rem; line-height: 1.3; font-weight: 700; color: #111827; margin: 1.5rem 0 0.6rem; }
                .cms-content-render h2 { font-size: 1.1rem; line-height: 1.35; font-weight: 700; color: #111827; margin: 1.5rem 0 0.5rem; }
                .cms-content-render h3 { font-size: 1rem; line-height: 1.4; font-weight: 600; color: #1f2937; margin: 1.25rem 0 0.4rem; }
                .cms-content-render > :first-child { margin-top: 0; }
                .cms-content-render p { margin-bottom: 0.85rem; }
                .cms-content-render a { color: #843D9B; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
                .cms-content-render strong, .cms-content-render b { color: #111827; font-weight: 600; }
                .cms-content-render ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 1rem; }
                .cms-content-render ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 1rem; }
                .cms-content-render li { margin-bottom: 0.35rem; line-height: 1.65; }
                .cms-content-render li::marker { color: #843D9B; }
                .cms-content-render img { max-width: 100%; height: auto; border-radius: 12px; }
            `}} />
        </div>
    );
};

export default CMSContentPage;
