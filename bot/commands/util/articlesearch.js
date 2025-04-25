const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search_articles')
        .setDescription(`Search for articles on the Temple's site.`)
        .addStringOption(option =>
            option.setName('query')
                .setDescription('What are you looking for?')
                .setRequired(true)),

    async execute(interaction) {
        // Log command usage 
        logCommand('Article search', interaction.user.username);
        const query = interaction.options.getString('query');
        const searchUrl = `https://templeofchrysalis.com/?s=${encodeURIComponent(query)}`;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const response = await axios.get(searchUrl);
            const html = response.data;
            const $ = cheerio.load(html);

            const posts = [];
            $('.elementor-post').each((index, element) => {
                const title = $(element).find('.elementor-post__title a').text().trim();
                const link = $(element).find('.elementor-post__title a').attr('href');
                if (title && link) {
                    posts.push({ title, link });
                }
            });

            // Limit the results to the 3 most related articles
            const limitedPosts = posts.slice(0, 3);

            if (limitedPosts.length === 0) {
                return interaction.editReply({ content: `I'm sorry, no articles found. 😞`, flags: MessageFlags.Ephemeral });
            }

            const links = limitedPosts.map(post => `🔹 **${post.title}**\n<${post.link}>`).join('\n\n');

            await interaction.editReply({
                content: `Search results for: "${query} ": \n\n${links}`,
                flags: MessageFlags.Ephemeral,
                allowed_mentions: { parse: [] }
            });

        } catch (error) {
            console.error('Error scraping the website:', error);
            await interaction.editReply({
                content: 'Search request failed. 😞',
                flags: MessageFlags.Ephemeral,
                allowed_mentions: { parse: [] }
            });
        }
    },
};