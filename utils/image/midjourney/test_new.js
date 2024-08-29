let web_socket = new WebSocket("wss://ws.midjourney.com/ws");

const mj_cookie =
	"__Host-Midjourney.AuthUserToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiZmlyZWJhc2UiLCJpZFRva2VuIjoiZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkltVXlZakl5Wm1RME4yVmtaVFk0TW1ZMk9HWmhZMk5tWlRkak5HTm1OV0l4TVdJeE1tSTFOR0lpTENKMGVYQWlPaUpLVjFRaWZRLmV5SnVZVzFsSWpvaWFtbG5aMncxSWl3aWJXbGthbTkxY201bGVWOXBaQ0k2SWpOaE1UTTBOR1l5TFdVNU5EZ3ROR0ZqTUMwNE1tVmtMVEU1TkRZNU1HUXhaV0ZpTmlJc0ltbHpjeUk2SW1oMGRIQnpPaTh2YzJWamRYSmxkRzlyWlc0dVoyOXZaMnhsTG1OdmJTOWhkWFJvYW05MWNtNWxlU0lzSW1GMVpDSTZJbUYxZEdocWIzVnlibVY1SWl3aVlYVjBhRjkwYVcxbElqb3hOekUyTURnMU5qZzNMQ0oxYzJWeVgybGtJam9pZW01TlptaEZZbEZ3WjFaQ1QydFdSVXR2TlRacmVucHhUa1Z4TWlJc0luTjFZaUk2SW5wdVRXWm9SV0pSY0dkV1FrOXJWa1ZMYnpVMmEzcDZjVTVGY1RJaUxDSnBZWFFpT2pFM01UWXdPRFUyT0Rjc0ltVjRjQ0k2TVRjeE5qQTRPVEk0Tnl3aVpXMWhhV3dpT2lKdGFXUnFhV2RuYkVCbmJXRnBiQzVqYjIwaUxDSmxiV0ZwYkY5MlpYSnBabWxsWkNJNmRISjFaU3dpWm1seVpXSmhjMlVpT25zaWFXUmxiblJwZEdsbGN5STZleUprYVhOamIzSmtMbU52YlNJNld5SXhNalF4TURNek16TTBNekF5TVRjNU16STVJbDBzSW1WdFlXbHNJanBiSW0xcFpHcHBaMmRzUUdkdFlXbHNMbU52YlNKZGZTd2ljMmxuYmw5cGJsOXdjbTkyYVdSbGNpSTZJbVJwYzJOdmNtUXVZMjl0SW4xOS5kdjd2M3lTWXFObHJGZnE1Z3Vfa2VrQjBGN20xTGRIb3J3Mk15MU1iRGk2WTNtVFJib0l4UVpobEM0cERfVmY1M3czVDFqakRXZWEtdC04ajJlUzZZYnMzekxkNHVobjA2eS00bUVUQUpUZDVsSjNLTDZ1VzBQNUQ2RkdSOFEzbDBNelhBVVlVSE9XVmZQOUJHUTdzNkZOWkxqTnFsUENNamxCSTItUmREMjZLYWZYUVJhTXoyLUlSZlhxd3RTYXl1TldiU0ZfNEF4UUEwVE9SOV9tUF9lenotSER2cC1HellfYnRJQ21GRHRQZzZDdW9FRDdwRzNTZC14aUVHLVp5aExnRWh0ZmlTN2d4WGljc0lHTzJldTMwaE5NenFLTGpReFpDMHVaWGFrRUpIcVh2STlMZU1MRUxTR3AzV01kRHAtYWliQk5HbXNPUDJHWGZ6cEJpMHciLCJyZWZyZXNoVG9rZW4iOiJBTWYtdkJ4RjNpcGE3SlltNkRSRVc4elQ4V0VCWE10eDNuN2kyV3VCdWZVWFNYdExPZUhqeG9fdkJLOGRkMWo2cWIzTTl4YmY0dENZdHdkVTFYOVRCNE9rbmhkSmNfcVNscjFBMWpLSnljU2pXbFFUOXZqX3d0UmJDMEZ4cGlTcWtUVm1raFktTzB3akxtajV2U3R5cW5RbmVzV3d2bmlaSDVPcDZLQjIwWk1KeU5HZHRZQWxNSVJLT2tSd3ZuUDQya19aSEtxM2Y2SzdNdkRKNkd6aXZNTHJZOTN0VW5lUXVzdlZtTTY3MFlPN3BpVnk5dzh1SkpIZXY5NG9mLXpGUU9lLXNyZVE1djNrIiwiaWF0IjoxNzE2MDg1Njg3fQ.zgbGYvsXEH9ymi2upxDNj9a8fNkF59GvCFXqOjwXmdk;";

/** @param {WebSocket} socket */
function isWarpCurrent(socket) {
	return socket.readyState !== WebSocket.CONNECTING && socket.close(4998);
}

/** @param {WebSocket} socket */
function closeWarpImmediately(socket) {
	socket.readyState !== WebSocket.CONNECTING && socket.close(4999);
}

async function getWebsocketAccessToken() {
	return await fetch("/api/auth/websocket-token", {
		method: "GET",
		headers: {
            
		accept: "*/*",
		"content-type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
		"x-csrf-protection": "1",
		cookie: mj_cookie,
		Referer: "https://www.midjourney.com/imagine",
		"Referrer-Policy": "origin-when-cross-origin",
			"Content-Type": "application/json",
			"X-CSRF-Protection": "1",
		},
	}).then((res) => (res.ok ? res.json() : null));
}

// fetch("https://www.midjourney.com/api/app/submit-jobs", {
// 	headers: {
// 		accept: "*/*",
// 		"content-type": "application/json",
//         "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
// 		"x-csrf-protection": "1",
// 		cookie: mj_cookie,
// 		Referer: "https://www.midjourney.com/imagine",
// 		"Referrer-Policy": "origin-when-cross-origin",
// 	},
// 	body: '{"prompt":"home","prompts":["home"],"parameters":{},"flags":{"mode":"relaxed","private":false},"jobType":"imagine","id":null,"index":null,"roomId":null,"channelId":"singleplayer_3a1344f2-e948-4ac0-82ed-194690d1eab6","metadata":{"imagePrompts":0,"imageReferences":0,"characterReferences":0,"autoPrompt":false}}',
// 	method: "POST",
// }).then(async (res) => {
// 	console.log(res.body);
// 	console.log(await res.json());
// });
web_socket.send(JSON.stringify({
    v: 
}))

const secr = "1a6862e063fd2fa6583e2775820eebdaae5499f9".slice(0, 7);

https://www.midjourney.com/_next/static/chunks/pages/_app-3507ff747ca094b2.js

{"type":"subscribe_to_user","jwt":"eyJ1c2VyX2lkIjoiM2ExMzQ0ZjItZTk0OC00YWMwLTgyZWQtMTk0NjkwZDFlYWI2IiwidXNlcm5hbWUiOiJqaWdnbDUiLCJpYXQiOjE3MTYwODYxNTR9.hFfQrEa3tAxoqsrrLaHyvIswJgHk906Uid3wRLnxLUk","v":"1a6862e"}
(web_socket.onopen = () => {
	if (isWarpCurrent(web_socket)) {
		if ("authenticated" !== em.current.status || !(0, ea.Rj)(em.current)) {
			closeWarpImmediately(web_socket);
			return;
		}
		(ey.current = 0),
			eh.size > 0 && (eh.forEach((L) => sendMessage(L)), eh.clear()),
			(0, ec.Bm)(em.current.id, H),
			getWebsocketAccessToken().then((L) => {
				if (
					null != L &&
					(sendMessage({
						type: "subscribe_to_user",
						jwt: L,
					}),
					null != ev.current)
				)
					for (let H = 0; H < ev.current.length; H++) {
						let V = ev.current[H];
						if ("allowed" !== V.access) continue;
						let K = V.jobChannel.id;
						subscribeToRoom(K, L), eb(V.jobChannel);
					}
			}),
			null != ed && clearTimeout(ed),
			(ed = setTimeout(() => {
				null != eu && eu.readyState === WebSocket.OPEN && (closeWarpImmediately(eu), connectToWS());
			}, 36e5 * Math.random()));
	}
}),
	(web_socket.onclose = (L) => {
		if (!isWarpCurrent(web_socket)) return;
		let H = retryTimeout(ey.current);
		(eu = null),
			setTimeout(() => {
				connectToWS(), (ey.current += 1);
			}, H);
	}),
	(web_socket.onerror = (L) => {
		if (!isWarpCurrent(web_socket)) return;
	}),
	(web_socket.onmessage = (L) => {
		let { data: Q } = L;
		if (!isWarpCurrent(web_socket)) return;
		if ("authenticated" !== em.current.status) {
			closeWarpImmediately(web_socket);
			return;
		}
		let ei = JSON.parse(Q);
		switch (ei.type) {
			case "room_new_job": {
				let L = H.imagineFeed.current.data;
				if (null == L) break;
				let V = ei.room_id !== (0, el.CF)(em.current.id);
				if (ei.job.user_id == em.current.id) {
					let L = (0, K.ZC)(ei.job);
					(0, ec.iO)(H, [
						{
							status: "success",
							newJob: L,
							originalOptimisticJobId: ei.job.optimisticJobId,
						},
					]),
						(0, ec.pM)(H, [L]);
				}
				V && (0, ec.G9)(H, ei.room_id, [ei.job]),
					subscribeToJob({
						jobId: ei.job.id,
						roomId: ei.room_id,
					}),
					H.scheduleRender();
				break;
			}
			case "job_progress": {
				var ea, es, eo, eu, ed;
				let L = H.imagineFeed.current.data;
				if (null == L) break;
				let V = !0,
					Q = null != ei.room_id && ei.room_id != (0, el.CF)(em.current.id);
				if (Q) {
					let L =
							null !== (ea = H.allRoomFeeds.get(ei.room_id)) && void 0 !== ea
								? ea
								: {
										optimisticJobs: [],
										grabBagOfJobs: new Map(),
										jobIdToMessageId: new Map(),
								  },
						K = L.grabBagOfJobs.get(ei.job_id);
					null != K &&
						((V = !1),
						L.grabBagOfJobs.set(
							ei.job_id,
							(function (L, H) {
								let V = H;
								switch (L.current_status) {
									case "error":
										V = {
											...H,
											progressStatus: "error",
											progressError: {
												kind: "generic",
												message: "Error receiving progress.",
											},
										};
										break;
									case "canceled":
										V = {
											...H,
											progressStatus: "cancelled",
										};
										break;
									case "queued":
									case "start_stage":
										break;
									case "interrupted":
									case "unqueue":
									case "unknown":
									case "starting":
										"error" != H.progressStatus &&
											"optimistic" != H.progressStatus &&
											(V = {
												...H,
												progressStatus: "waiting-for-progress",
											});
										break;
									case "completed":
										switch (H.progressStatus) {
											case "error":
											case "optimistic":
											case "cancelled":
												break;
											case "waiting-for-progress":
											case "queued":
											case "completed":
											case "submitted":
											case "in-progress":
												V = {
													id: H.id,
													event_type: H.event_type,
													parent_grid: H.parent_grid,
													parent_id: H.parent_id,
													width: H.width,
													height: H.height,
													prompt: H.prompt,
													published: H.published,
													liked_by_user: H.liked_by_user,
													enqueue_time: H.enqueue_time,
													username: H.username,
													user_id: H.user_id,
													images: H.images,
													progressStatus: "completed",
													liked_by_user_in_room: H.liked_by_user_in_room,
												};
										}
										break;
									case "running":
										if ("error" != H.progressStatus && "optimistic" != H.progressStatus) {
											let K = null != L.imgs && L.imgs.length === H.images.length ? L.imgs : "in-progress" === H.progressStatus ? H.progress.imgs : null;
											V = {
												...H,
												progressStatus: "in-progress",
												progress: {
													...L,
													imgs: K,
												},
											};
										}
								}
								return V;
							})(ei.data, K)
						),
						H.allRoomFeeds.set(ei.room_id, L));
				}
				let eh = [...L];
				for (let K = 0; K < L.length; K++) {
					let ea = L[K];
					if (ea.id === ei.job_id) {
						if (((V = !1), "cancelled" === ea.progressStatus)) break;
						let L = (function (L, H) {
							let V = H;
							switch (L.current_status) {
								case "error":
									V = {
										...H,
										progressStatus: "error",
										progressError: {
											kind: "generic",
											message: "Error receiving progress.",
										},
									};
									break;
								case "canceled":
									V = {
										...H,
										progressStatus: "cancelled",
									};
									break;
								case "queued":
								case "start_stage":
									break;
								case "interrupted":
								case "unqueue":
								case "unknown":
								case "starting":
									"error" != H.progressStatus &&
										"optimistic" != H.progressStatus &&
										(V = {
											...H,
											progressStatus: "waiting-for-progress",
										});
									break;
								case "completed":
									switch (H.progressStatus) {
										case "error":
										case "optimistic":
										case "cancelled":
											break;
										case "waiting-for-progress":
										case "queued":
										case "completed":
										case "submitted":
										case "in-progress":
											V = {
												id: H.id,
												event_type: H.event_type,
												parent_grid: H.parent_grid,
												parent_id: H.parent_id,
												width: H.width,
												height: H.height,
												prompt: H.prompt,
												published: H.published,
												liked_by_user: H.liked_by_user,
												enqueue_time: H.enqueue_time,
												username: H.username,
												images: H.images,
												dateString: H.dateString,
												jobFiltered: H.jobFiltered,
												progressStatus: "completed",
											};
									}
									break;
								case "running":
									if ("error" != H.progressStatus && "optimistic" != H.progressStatus) {
										let K = null != L.imgs && L.imgs.length === H.images.length ? L.imgs : "in-progress" === H.progressStatus ? H.progress.imgs : null;
										V = {
											id: H.id,
											event_type: H.event_type,
											parent_grid: H.parent_grid,
											parent_id: H.parent_id,
											width: H.width,
											height: H.height,
											prompt: H.prompt,
											published: H.published,
											liked_by_user: H.liked_by_user,
											enqueue_time: H.enqueue_time,
											username: H.username,
											images: H.images,
											dateString: H.dateString,
											jobFiltered: H.jobFiltered,
											progressStatus: "in-progress",
											progress: {
												percentage_complete: L.percentage_complete,
												imgs: K,
											},
										};
									}
							}
							return V;
						})(ei.data, ea);
						if (((eh[K] = L), Q)) {
							let V =
								null !== (es = H.allRoomFeeds.get(ei.room_id)) && void 0 !== es
									? es
									: {
											optimisticJobs: [],
											grabBagOfJobs: new Map(),
											jobIdToMessageId: new Map(),
									  };
							V.grabBagOfJobs.set(ea.id, {
								...L,
								user_id: em.current.id,
								liked_by_user_in_room: [],
							}),
								H.allRoomFeeds.set(ei.room_id, V);
						}
						break;
					}
				}
				((H.imagineFeed.current = {
					...H.imagineFeed.current,
					data: eh,
				}),
				V)
					? Q
						? ((eo = ei.job_id),
						  (eu = ei.room_id),
						  (ed = em.current.id),
						  (0, el.CK)([eo], (L) => {
								if ("error" === L.type || 0 === L.jobs.length) return;
								(0, ec.G9)(H, eu, L.jobs.map(K.WD));
								let V = L.jobs.filter((L) => L.user_id == ed);
								if ((V.length > 0 && (0, ec.pM)(H, V.map(K.n)), null != H.jobQueue.current.jobs)) {
									let V = H.jobQueue.current.jobs.filter((H) => null == L.jobs.find((L) => L.id === H.jobId));
									H.jobQueue.current = {
										jobs: V,
									};
								}
								H.scheduleRender();
						  }))
						: fetchJobsAndMergeIntoImagineFeed(H, [ei.job_id])
					: null != H.jobQueue.current.jobs &&
					  "queued" !== ei.data.current_status &&
					  (H.jobQueue.current = {
							jobs: H.jobQueue.current.jobs.filter((L) => L.jobId !== ei.job_id),
					  }),
					H.scheduleRender();
				break;
			}
			case "list_of_users":
			case "user_success":
			case "room_success":
			case "job_success":
			case "room_error":
			case "room_new_job_error":
				break;
			case "job_error":
				let eh = H.imagineFeed.current.data;
				if (null == eh) return;
				let ep = eh.findIndex((L) => L.id === ei.job_id);
				if (-1 === ep) return;
				let ef = [...eh];
				(ef[ep] = {
					...ef[ep],
					progressStatus: "error",
					progressError: {
						kind: "generic",
						message: ei.message,
					},
				}),
					(H.imagineFeed.current = {
						...H.imagineFeed.current,
						data: ef,
					});
				let eg = H.allRoomFeeds.get(ei.room_id);
				if (null != eg) {
					let L = eg.grabBagOfJobs.get(ei.job_id);
					null != L &&
						eg.grabBagOfJobs.set(ei.job_id, {
							...L,
							progressStatus: "error",
							progressError: {
								kind: "generic",
								message: ei.message,
							},
						});
				}
				H.scheduleRender();
		}
	});
