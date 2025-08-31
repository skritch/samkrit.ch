import React from "react";

// import {
//   AppBskyFeedDefs,
//   Brand,
//   AppBskyFeedPost,
//   AppBskyEmbedRecord,
// } from "@atcute/client/lexicons";
import * as bluesky from '@atcute/bluesky';
import { } from "@atcute/lexicons";
// import a from "next/a";
import {
  LuArrowLeft,
  LuArrowRight,
  LuHeart,
  LuRecycle,
  LuRepeat2 ,
  LuReply,
} from "react-icons/lu";
// import {} from "react-icons/fa6";

import BlueskyEmbed from "./BlueskyEmbed";
// import { PiButterfly, PiButterflyFill } from "react-icons/pi";

type ThreadView = bluesky.AppBskyFeedDefs.ThreadViewPost;
type BlueskyPost = bluesky.AppBskyFeedPost.Main;

function isPost(post: any): post is BlueskyPost {
  return post.$type === "app.bsky.feed.post";
}

export interface BlueskyReplyProps {
  thread: ThreadView;
  depth?: number;
  skipFirst?: boolean;
}

const BlueskyReply = ({
  thread,
  depth = 0,
  skipFirst = false,
}: BlueskyReplyProps) => {
  if (thread.$type !== "app.bsky.feed.defs#threadViewPost") {
    console.log("Not a threadViewPost")
    return null;
  }

  const { post, replies } = thread;
  const { author, embed, replyCount, repostCount, likeCount, record } = post;
  let bskyPost: BlueskyPost;
  if (isPost(record)) {
    bskyPost = record as BlueskyPost;
  }

  if (depth==0 && skipFirst) {
    return (
      <p>No comments yet...</p>
    );
  }

  // Limit nesting depth to prevent too deep chains
  const MAX_DEPTH = 5;

  // Add visual connector line for nested replies
  const marginLeft = depth * 15 - 10
  const hasBorderLeft = (skipFirst && depth > 2) || (!skipFirst && depth > 1);

  return (
    <div style={{ 
      marginLeft: marginLeft, 
      // borderLeft: hasBorderLeft ? '2px solid #e5e7eb' : 'none', 
      // paddingLeft: hasBorderLeft ? '12px' : '0'
    }}>
      {!skipFirst && (
        <div style={{ 
          margin: '16px 0',
          padding: '12px',
          border: '1px solid #f5e7eb',
          borderRadius: '8px',
          // backgroundColor: '#fafafa',
        }}>
          {/* Author Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '12px'}}>
            <img
              src={author.avatar}
              alt={author.displayName}
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                marginRight: '12px',
              }}
            />
            <div>
              <a
                style={{ 
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  color: '#1f2937'
                }}
                href={`https://bsky.app/profile/${author.did}`}
              >
                {author.displayName}
              </a>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                <a 
                  href={`https://bsky.app/profile/${author.did}`}
                  style={{ textDecoration: 'none', color: '#6b7280' }}
                >
                  @{author.handle}
                </a>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div style={{ marginBottom: '12px', lineHeight: '1.5' }}>
            <span>{bskyPost?.text}</span>
          </div>

          {/* Embed Section */}
          {/* {embed && <BlueskyEmbed embed={bskyPost.embed} did={author.did} />} */}

          {/* Engagement Stats */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            color: '#6b7280', 
            fontSize: '14px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span>{likeCount}</span> <LuHeart />
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span>{replyCount}</span> <LuReply />
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span>{repostCount}</span> <LuRepeat2  />
            </div>
            <a
              href={`https://bsky.app/profile/${author.did}/post/${post.uri.split("/").pop()}`}
              style={{ 
                display: 'flex', 
                gap: '4px', 
                alignItems: 'center',
                textDecoration: 'none',
                color: '#3b82f6'
              }}
            >
              Go to post
              <LuArrowRight />
            </a>
          </div>
        </div>
      )}

      {/* Nested Replies */}
      {depth < MAX_DEPTH && replies && replies.length > 0 && (
        <div>
          {replies
            .filter((r) => r.$type === "app.bsky.feed.defs#threadViewPost")
            .map((nestedReply, index) => (
              <BlueskyReply
                key={`${(nestedReply as any).post?.uri}-${index}`}
                thread={nestedReply as ThreadView}
                depth={depth + 1}
              />
            ))}
        </div>
      )}

      {/* Show "View more replies" button if depth limit reached */}
      {depth === MAX_DEPTH && replies && replies.length > 0 && (
        <button style={{
          color: '#3b82f6',
          background: 'none',
          border: 'none',
          marginLeft: '16px',
          marginTop: '8px',
          cursor: 'pointer',
          textDecoration: 'underline'
        }}>
          View more replies...
        </button>
      )}
    </div>
  );
};

export default BlueskyReply;