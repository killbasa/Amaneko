import { z } from 'zod';

export const PostSchema = z.object({
	backstagePostRenderer: z.object({
		postId: z.string(),
		authorText: z.object({
			runs: z.array(
				z.object({
					text: z.string()
				})
			)
		}),
		authorThumbnail: z.object({
			thumbnails: z.array(z.object({ url: z.string() }))
		}),
		contentText: z.object({
			runs: z.array(
				z.object({
					text: z.string()
				})
			)
		}),
		publishedTimeText: z.object({
			runs: z.array(
				z.object({
					text: z.string()
				})
			)
		})
	})
});

export const ScrapeSchema = z.array(
	z
		.object({
			tabRenderer: z.object({
				title: z.string(),
				content: z
					.object({
						sectionListRenderer: z
							.object({
								contents: z.array(
									z.object({
										itemSectionRenderer: z
											.object({
												contents: z.array(
													z.object({
														backstagePostThreadRenderer: z
															.object({
																post: PostSchema
															})
															.optional()
													})
												)
											})
											.optional()
									})
								)
							})
							.optional()
					})
					.optional()
			})
		})
		.optional()
);
