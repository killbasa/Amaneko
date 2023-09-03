import { z } from 'zod';

export const YoutubeDataSchema = z.object({
	kind: z.string(),
	etag: z.string(),
	pageInfo: z.object({
		totalResults: z.number(),
		resultsPerPage: z.number()
	}),
	items: z.array(
		z.object({
			kind: z.string(),
			etag: z.string(),
			id: z.string(),
			snippet: z.object({
				title: z.string(),
				description: z.string(),
				customUrl: z.string(),
				publishedAt: z.string(),
				thumbnails: z.object({
					default: z.object({
						url: z.string(),
						width: z.number(),
						height: z.number()
					}),
					medium: z.object({
						url: z.string(),
						width: z.number(),
						height: z.number()
					}),
					high: z.object({
						url: z.string(),
						width: z.number(),
						height: z.number()
					})
				}),
				localized: z.object({
					title: z.string(),
					description: z.string()
				}),
				country: z.string()
			}),
			contentDetails: z.object({
				relatedPlaylists: z.object({
					likes: z.string(),
					uploads: z.string()
				})
			}),
			statistics: z.object({
				viewCount: z.string(),
				subscriberCount: z.string(),
				hiddenSubscriberCount: z.boolean(),
				videoCount: z.string()
			})
		})
	)
});

export type YoutubeData = z.infer<typeof YoutubeDataSchema>;
